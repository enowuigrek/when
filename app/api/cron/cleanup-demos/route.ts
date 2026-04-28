import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("tenants")
    .delete()
    .eq("kind", "demo")
    .lt("expires_at", nowIso)
    .select("id, slug, expires_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    deletedCount: data?.length ?? 0,
    deleted: (data ?? []).map((t) => ({ id: t.id, slug: t.slug, expires_at: t.expires_at })),
    ranAt: nowIso,
  });
}
