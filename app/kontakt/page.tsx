import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TenantThemeWrapper } from "@/components/tenant-theme-wrapper";
import { getSettings } from "@/lib/db/settings";

export async function generateMetadata() {
  const s = await getSettings();
  return { title: `Kontakt — ${s.business_name}` };
}

export default async function ContactPage() {
  const s = await getSettings();

  const hasAddress = s.address_street || s.address_city;

  return (
    <TenantThemeWrapper>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">
            {s.business_name}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Kontakt</h1>

          <div className="mt-10 space-y-4">
            {/* Address */}
            {hasAddress && (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4">
                <p className="mb-1 font-mono text-xs uppercase tracking-widest text-zinc-500">Adres</p>
                <p className="text-sm text-zinc-200">
                  {s.address_street && <span className="block">{s.address_street}</span>}
                  {(s.address_postal || s.address_city) && (
                    <span className="block">
                      {[s.address_postal, s.address_city].filter(Boolean).join(" ")}
                    </span>
                  )}
                </p>
                {s.maps_url && (
                  <a
                    href={s.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-[var(--color-accent)] hover:opacity-80 transition-opacity"
                  >
                    Otwórz w Mapach →
                  </a>
                )}
              </div>
            )}

            {/* Phone */}
            {s.phone && (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4">
                <p className="mb-1 font-mono text-xs uppercase tracking-widest text-zinc-500">Telefon</p>
                <a
                  href={`tel:${s.phone.replace(/\s/g, "")}`}
                  className="text-sm text-zinc-200 hover:text-[var(--color-accent)] transition-colors"
                >
                  {s.phone}
                </a>
              </div>
            )}

            {/* Email */}
            {s.email && (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4">
                <p className="mb-1 font-mono text-xs uppercase tracking-widest text-zinc-500">Email</p>
                <a
                  href={`mailto:${s.email}`}
                  className="text-sm text-zinc-200 hover:text-[var(--color-accent)] transition-colors"
                >
                  {s.email}
                </a>
              </div>
            )}

            {/* Social */}
            {(s.instagram_url || s.facebook_url || s.website_url) && (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4">
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-zinc-500">Social / Web</p>
                <div className="flex flex-wrap gap-3">
                  {s.instagram_url && (
                    <a href={s.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-zinc-300 hover:text-[var(--color-accent)] transition-colors">
                      Instagram →
                    </a>
                  )}
                  {s.facebook_url && (
                    <a href={s.facebook_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-zinc-300 hover:text-[var(--color-accent)] transition-colors">
                      Facebook →
                    </a>
                  )}
                  {s.website_url && (
                    <a href={s.website_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-zinc-300 hover:text-[var(--color-accent)] transition-colors">
                      Strona www →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Fallback if nothing filled in */}
            {!hasAddress && !s.phone && !s.email && !s.instagram_url && !s.facebook_url && !s.website_url && (
              <p className="text-sm text-zinc-500">Dane kontaktowe nie zostały jeszcze uzupełnione.</p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </TenantThemeWrapper>
  );
}
