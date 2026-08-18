import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AdminRootPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const qs = new URLSearchParams({ widok: "dzien" });
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) qs.set("od", date);

  // Stay inside the /demo/{slug} URL space when the proxy rewrote us there —
  // a bare /admin redirect would drop the demo context and expose the real tenant.
  const demoSlug = (await headers()).get("x-demo-slug");
  const base = demoSlug ? `/demo/${demoSlug}` : "/admin";
  redirect(`${base}/harmonogram?${qs.toString()}`);
}
