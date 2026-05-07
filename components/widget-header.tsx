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
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-900">
      <div className="mx-auto flex h-[108px] max-w-3xl items-center px-6">
        <Link href={homeHref} className="hover:opacity-80 transition-opacity">
          {settings.logo_url ? (
            <div className="h-[88px] w-[210px] overflow-hidden rounded-2xl">
              <Image
                src={settings.logo_url}
                alt={settings.business_name}
                width={210}
                height={88}
                className="w-full h-full object-cover object-[center_58%]"
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
      </div>
    </header>
  );
}
