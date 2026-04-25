import "server-only";

type SendResult = { ok: true } | { ok: false; reason: string };

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Sends an email via Resend.
 * Silently no-ops in dev if RESEND_API_KEY is not set — booking still succeeds.
 */
export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? `when? <onboarding@resend.dev>`;

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", payload.to);
    return { ok: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Resend error", res.status, body);
    return { ok: false, reason: `Resend ${res.status}` };
  }

  return { ok: true };
}
