import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import type { Settings } from "@/lib/db/settings";

type Props = {
  settings: Settings;
  tenantSlug: string;
};

export async function WidgetHeader({ settings, tenantSlug }: Props) {
  const hdrs = await headers();
  const isSubdomain = !!hdrs.get("x-tenant-subdomain");
  const homeHref = isSubdomain ? "/" : `/widget/${tenantSlug}`;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link href={homeHref} className="hover:opacity-80 transition-opacity">
          {settings.logo_url ? (
            <div className="h-9 w-36 overflow-hidden rounded-lg">
              <Image
                src={settings.logo_url}
                alt={settings.business_name}
                width={144}
                height={36}
                className="w-full h-full object-cover object-center"
                unoptimized
              />
            </div>
          ) : (
            <span className="text-lg font-semibold tracking-tight text-zinc-100">
              {settings.business_name}
              <span className="text-[var(--color-accent)]">.</span>
            </span>
          )}
        </Link>

        <a
          href="https://whenbooking.pl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <span>Powered by</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="when" className="h-3 logo-adaptive opacity-50" />
        </a>
      </div>
    </header>
  );
}
