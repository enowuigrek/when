import { stopImpersonationAction } from "@/app/admin/(panel)/super-admin-actions";

/** Warning bar shown across the admin panel when a super-admin is acting as another tenant. */
export function ImpersonationBanner({
  currentTenantName,
}: {
  currentTenantName: string;
}) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm text-amber-100 backdrop-blur md:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-xs uppercase tracking-wider text-amber-300">Impersonujesz</span>
        <span className="truncate font-medium">{currentTenantName}</span>
      </div>
      <form action={stopImpersonationAction}>
        <button
          type="submit"
          className="whitespace-nowrap rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20"
        >
          ← Wróć do swojego konta
        </button>
      </form>
    </div>
  );
}
