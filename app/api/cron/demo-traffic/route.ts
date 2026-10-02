import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { buildDemoTrafficEmail } from "@/lib/email/demo-traffic";
import { warsawToday, warsawDayBoundsUtc, formatWarsawTime } from "@/lib/slots";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.whenbooking.pl";

/**
 * Mów mi, kiedy prospekt ogląda demo.
 *
 * Chodzi co godzinę i wysyła najwyżej jeden mail na demo na dzień, przy
 * pierwszym wejściu. Nie przy każdej odsłonie: ktoś klikający po panelu
 * zrobiłby kilkanaście maili w kwadrans i następnym razem nikt by ich nie
 * czytał. Nie raz na zawsze: powrót po trzech dniach jest mocniejszym
 * sygnałem niż pierwsze kliknięcie i ma dojść.
 *
 * Dzień liczony po warszawsku. Wejście o 23:30 należy do dnia, w którym
 * nastąpiło, a nie do następnego, jak wyszłoby po UTC.
 *
 * Kolejność: najpierw zapisujemy, że wysyłamy, potem wysyłamy. Gdyby
 * odwrotnie, awaria między wysyłką a zapisem dałaby ten sam mail co
 * godzinę do północy. Jeśli wysyłka padnie, zapis jest cofany, żeby
 * następny przebieg spróbował jeszcze raz — lepiej spóźniony mail niż
 * żaden, a klucz na (najemca, dzień) i tak wyklucza duplikat.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // sendEmail() udaje sukces, kiedy wysyłka jest wyłączona albo brak klucza
  // — rozsądnie dla rezerwacji, która ma się udać mimo niedziałającej poczty,
  // ale tutaj oznaczałoby to zaklepanie dnia i raport „wysłano" przy zerze
  // wysłanych maili. Powiadomienie, które cicho nie dochodzi, jest gorsze od
  // żadnego, bo wierzysz, że cisza znaczy brak ruchu.
  if (process.env.EMAIL_ENABLED !== "true" || !process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Wysyłka maili wyłączona — ustaw EMAIL_ENABLED=true i RESEND_API_KEY", sent: [] },
      { status: 503 }
    );
  }

  const supabase = createAdminClient();
  const today = warsawToday();
  const { startIso, endIso } = warsawDayBoundsUtc(today);

  // Dokąd pisać. Adres właściciela WHEN, nie najemcy — to jedyny mail
  // w projekcie, który leci do nas, a nie do klienta.
  const { data: main } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", "when")
    .maybeSingle();
  const { data: mainSettings } = main
    ? await supabase.from("settings").select("email").eq("tenant_id", main.id).maybeSingle()
    : { data: null };
  const to = mainSettings?.email as string | null | undefined;
  if (!to) return NextResponse.json({ error: "Brak adresu w settings tenanta 'when'" }, { status: 500 });

  const { data: visits, error } = await supabase
    .from("demo_visits")
    .select("tenant_id, path, at")
    .gte("at", startIso)
    .lt("at", endIso)
    .order("at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = { tenant_id: string; path: string; at: string };
  const rows = (visits ?? []) as Row[];
  if (rows.length === 0) return NextResponse.json({ day: today, sent: [], skipped: [] });

  // Nazwy osobnym zapytaniem, nie zagnieżdżonym selectem: kształt, jaki
  // PostgREST zwraca dla osadzonej relacji jeden-do-jednego, zależy od tego,
  // czy widzi klucz unikalny, i cicho daje undefined, gdy się pomylisz.
  const ids = [...new Set(rows.map((r) => r.tenant_id))];
  const [{ data: tenantRows }, { data: settingRows }] = await Promise.all([
    supabase.from("tenants").select("id, slug").in("id", ids),
    supabase.from("settings").select("tenant_id, business_name").in("tenant_id", ids),
  ]);
  const slugBy = new Map((tenantRows ?? []).map((t) => [t.id as string, t.slug as string]));
  const nameBy = new Map(
    (settingRows ?? []).map((s) => [s.tenant_id as string, s.business_name as string])
  );

  const byTenant = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byTenant.get(r.tenant_id) ?? [];
    list.push(r);
    byTenant.set(r.tenant_id, list);
  }

  const sent: string[] = [];
  const skipped: string[] = [];

  for (const [tenantId, list] of byTenant) {
    const slug = slugBy.get(tenantId);
    if (!slug) continue;

    // Zaklep dzień. Konflikt = ktoś (poprzedni przebieg) już wysłał.
    const { error: claimError } = await supabase
      .from("demo_visit_alerts")
      .insert({ tenant_id: tenantId, day: today });
    if (claimError) {
      skipped.push(slug);
      continue;
    }

    const { subject, html, text } = buildDemoTrafficEmail({
      businessName: nameBy.get(tenantId) ?? slug,
      slug,
      views: list.length,
      pages: new Set(list.map((r) => r.path)).size,
      sawCustomerView: list.some((r) => r.path.startsWith("/zapisy")),
      firstAt: formatWarsawTime(list[0].at),
      lastAt: formatWarsawTime(list[list.length - 1].at),
      panelUrl: `${SITE}/demo/${slug}`,
    });

    const res = await sendEmail({ to, subject, html, text });
    if (res.ok) {
      sent.push(slug);
    } else {
      // Oddaj dzień, żeby następny przebieg spróbował ponownie.
      await supabase
        .from("demo_visit_alerts")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("day", today);
      skipped.push(`${slug} (błąd wysyłki)`);
    }
  }

  return NextResponse.json({ day: today, sent, skipped });
}
