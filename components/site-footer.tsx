import { business } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/60 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          © {new Date().getFullYear()} {business.name}. Wszystkie prawa zastrzeżone.
        </div>
        <div className="text-zinc-600">
          Zbudowane na <span className="text-zinc-400">when?</span> — system rezerwacji online.
        </div>
      </div>
    </footer>
  );
}
