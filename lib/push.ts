import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@whenbooking.pl";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Send a push notification to all subscriptions for a tenant.
 * Fire-and-forget — never throws (expired subscriptions are cleaned up).
 */
export async function sendPushToTenant(
  tenantId: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("tenant_id", tenantId);

  if (!subs || subs.length === 0) return;

  const json = JSON.stringify(payload);
  const stale: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: {
              p256dh: sub.p256dh as string,
              auth: sub.auth as string,
            },
          },
          json
        );
      } catch (err: unknown) {
        // 410 Gone or 404 = subscription expired, remove it
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          stale.push(sub.id as string);
        }
      }
    })
  );

  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", stale);
  }
}
