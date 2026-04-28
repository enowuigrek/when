import { getSettings } from "@/lib/db/settings";

export async function SiteFooter() {
  const s = await getSettings();
  return (
    <footer className="border-t border-zinc-800/60 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-zinc-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Business name */}
          <div>
            © {new Date().getFullYear()} {s.business_name}. Wszystkie prawa zastrzeżone.
          </div>

          {/* Powered by + credit */}
          <div className="flex flex-wrap items-center gap-4 text-zinc-600">
            <span className="flex items-center gap-1.5">
              Rezerwacje przez{" "}
              <a
                href="https://whenbooking.pl"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:opacity-80 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="when" className="h-3.5 logo-adaptive opacity-60" />
              </a>
            </span>
            <span className="h-3 w-px bg-zinc-800" />
            <a
              href="https://lukasznowak.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              lukasznowak.dev
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
