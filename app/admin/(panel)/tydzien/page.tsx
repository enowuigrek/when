import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function WeekRedirect() {
  // Preserve the /demo/{slug} prefix — see app/admin/(panel)/page.tsx.
  const demoSlug = (await headers()).get("x-demo-slug");
  const base = demoSlug ? `/demo/${demoSlug}` : "/admin";
  redirect(`${base}/harmonogram?widok=tydzien`);
}
