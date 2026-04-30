import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { getAdminTenantId } from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase/admin";

/** POST — save a push subscription */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { endpoint, keys } = body ?? {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      tenant_id: tenantId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "tenant_id,endpoint" }
  );

  if (error) {
    console.error("[push] subscribe error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — remove a push subscription */
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { endpoint } = body ?? {};

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const tenantId = await getAdminTenantId();
  const supabase = createAdminClient();

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
