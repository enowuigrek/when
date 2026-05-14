import Link from "next/link";
import { headers } from "next/headers";
import type { ComponentProps } from "react";

/**
 * Drop-in replacement for `next/link`'s `<Link>` in admin pages. When the
 * surrounding request was rewritten from `/demo/{slug}/*` by the proxy,
 * any `/admin/...` href is rewritten to `/demo/{slug}/...` so navigation
 * stays inside the demo URL space. Outside of demo, behaves identically
 * to `<Link>`.
 *
 * Only works in Server Components (uses `headers()`). For client-side
 * navigation links inside admin client components, derive the demo slug
 * from `usePathname()` instead.
 */
export async function AdminLink(props: ComponentProps<typeof Link>) {
  const { href } = props;
  const demoSlug = (await headers()).get("x-demo-slug");
  if (!demoSlug || typeof href !== "string") {
    return <Link {...props} />;
  }
  const rewritten =
    href === "/admin"
      ? `/demo/${demoSlug}`
      : href.startsWith("/admin/")
      ? `/demo/${demoSlug}${href.slice(6)}`
      : href;
  return <Link {...props} href={rewritten} />;
}
