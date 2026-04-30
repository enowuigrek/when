import Link from "next/link";
import { headers } from "next/headers";
import type { Settings } from "@/lib/db/settings";

type Props = {
  settings: Settings;
  tenantSlug: string;
};

/**
 * Header for the widget — tenant-aware version of SiteHeader.
 * Shows business name (linkable back to the service list) plus an
 * unobtrusive "Powered by WHEN" mark on the right. Mirrors the visual
 * weight of SiteHeader so the widget feels like a real site, not an
 * embedded form.
 *
 * On subdomain (*.whenbooking.pl), home link goes to "/" instead of
 * "/widget/{slug}" to keep the URL clean.
 */
export async function WidgetHeader({ settings, tenantSlug }: Props) {
  const hdrs = await headers();
  const isSubdomain = !!hdrs.get("x-tenant-subdomain");
  const homeHref = isSubdomain ? "/" : `/widget/${tenantSlug}`;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link
          href={homeHref}
          className="text-lg font-semibold tracking-tight text-zinc-100 hover:opacity-80 transition-opacity"
        >
          {settings.business_name}
          <span className="text-[var(--color-accent)]">.</span>
        </Link>

        <a
          href="https://whenbooking.pl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-[10px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="when" className="h-3 logo-adaptive mr-1.5 opacity-50" />
          Powered by WHEN
        </a>
      </div>
    </header>
  );
}
