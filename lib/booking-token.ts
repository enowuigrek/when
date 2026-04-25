import { createHmac } from "crypto";

const SECRET = process.env.BOOKING_TOKEN_SECRET ?? "dev-secret-please-change";

export type TokenAction = "cancel" | "reschedule";

export function signBookingToken(bookingId: string, action: TokenAction): string {
  const payload = `${bookingId}:${action}`;
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 40);
  return `${encoded}.${sig}`;
}

export function verifyBookingToken(
  token: string,
  action: TokenAction
): string | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!encoded || !sig) return null;

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return null;
  }

  const [bookingId, tokenAction] = payload.split(":");
  if (!bookingId || tokenAction !== action) return null;

  const expected = createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 40);
  if (sig !== expected) return null;

  return bookingId;
}
