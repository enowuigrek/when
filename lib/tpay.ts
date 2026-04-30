import "server-only";

/**
 * Tpay OpenAPI integration.
 * Docs: https://openapi.tpay.com
 *
 * env vars required:
 *   TPAY_CLIENT_ID      — OAuth2 client_id
 *   TPAY_CLIENT_SECRET  — OAuth2 client_secret
 *   TPAY_MERCHANT_ID    — Merchant ID (used in notification verification)
 *   TPAY_SECURITY_CODE  — Security code (used in md5 verification)
 *
 * All amounts in PLN (integer grosz → divide by 100 for Tpay).
 * Tpay accepts decimal amounts: 50.00
 */

const TPAY_BASE = "https://openapi.tpay.com";
const CLIENT_ID = process.env.TPAY_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.TPAY_CLIENT_SECRET ?? "";
const MERCHANT_ID = process.env.TPAY_MERCHANT_ID ?? "";
const SECURITY_CODE = process.env.TPAY_SECURITY_CODE ?? "";

export function tpayConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

/** Get short-lived OAuth2 token. ~1 hour TTL, request fresh each time for simplicity. */
async function getToken(): Promise<string> {
  const res = await fetch(`${TPAY_BASE}/oauth/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tpay OAuth failed: ${res.status} — ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export type CreateTransactionParams = {
  /** Amount in PLN (integer), e.g. 5000 = 50 zł */
  amountPln: number;
  description: string;
  customerName: string;
  customerEmail?: string | null;
  /** Stored in tr_crc — used to match webhook back to booking */
  bookingId: string;
  successUrl: string;
  errorUrl: string;
  notifyUrl: string;
};

export type CreateTransactionResult = {
  transactionId: string;
  paymentUrl: string;
};

export async function createTransaction(
  params: CreateTransactionParams
): Promise<CreateTransactionResult> {
  const token = await getToken();

  // Tpay expects decimal amount
  const amount = (params.amountPln / 100).toFixed(2);

  const body = {
    amount: parseFloat(amount),
    description: params.description,
    payer: {
      name: params.customerName,
      ...(params.customerEmail ? { email: params.customerEmail } : {}),
    },
    callbacks: {
      payerUrls: {
        success: params.successUrl,
        error: params.errorUrl,
      },
      notification: {
        url: params.notifyUrl,
        email: "", // optional merchant notification email
      },
    },
    // Store bookingId in crc — returned in webhook as tr_crc
    crc: params.bookingId,
    language: "pl",
  };

  const res = await fetch(`${TPAY_BASE}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Tpay create transaction failed: ${res.status} — ${errBody}`);
  }

  const data = (await res.json()) as {
    transactionId: string;
    transactionPaymentUrl: string;
  };

  return {
    transactionId: data.transactionId,
    paymentUrl: data.transactionPaymentUrl,
  };
}

/**
 * Verify Tpay webhook notification.
 * Tpay sends a form POST with tr_id, tr_amount, tr_crc, tr_status, md5sum.
 *
 * md5 = md5(MERCHANT_ID + tr_amount + tr_crc + SECURITY_CODE)
 *
 * Returns the booking ID (tr_crc) if verification passes, null otherwise.
 */
export function verifyTpayNotification(params: {
  trId: string;
  trAmount: string;
  trCrc: string;
  trStatus: string;
  md5sum: string;
}): boolean {
  if (!MERCHANT_ID || !SECURITY_CODE) return false;

  const { createHash } = require("crypto") as typeof import("crypto");
  const expected = createHash("md5")
    .update(`${MERCHANT_ID}${params.trAmount}${params.trCrc}${SECURITY_CODE}`)
    .digest("hex");

  return expected === params.md5sum && params.trStatus === "TRUE";
}

/**
 * For Tpay OpenAPI JSON notifications (newer API version).
 * The notification arrives as JSON with a `status` field.
 * We also verify using the JWS header — skipped in MVP, use md5 path above.
 */
export function parseTpayJsonNotification(body: Record<string, unknown>): {
  transactionId: string;
  bookingId: string;
  status: "correct" | "pending" | string;
  amountPaid: number;
} | null {
  const id = body.id as string | undefined;
  const crc = body.crc as string | undefined;
  const status = body.status as string | undefined;
  const amount = body.amount as number | undefined;

  if (!id || !crc || !status) return null;

  return {
    transactionId: id,
    bookingId: crc,
    status,
    amountPaid: amount ?? 0,
  };
}
