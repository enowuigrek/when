"use client";

import { useRef, useTransition } from "react";
import type { SwitchableTenant } from "@/lib/auth/super-admin";
import { switchTenantAction } from "@/app/admin/(panel)/super-admin-actions";

/**
 * Dropdown shown to super-admins inside the admin panel so they can
 * impersonate another tenant. Submits a server action — the redirect
 * to /admin re-fetches everything in the new tenant context.
 */
export function TenantSwitcher({
  tenants,
  currentTenantId,
}: {
  tenants: SwitchableTenant[];
  currentTenantId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const targetId = e.target.value;
    if (targetId === currentTenantId) return;
    const fd = new FormData();
    fd.set("tenantId", targetId);
    startTransition(() => {
      switchTenantAction(fd);
    });
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-mono uppercase tracking-wider text-zinc-500">Konto:</span>
      <form ref={formRef} className="contents">
        <select
          name="tenantId"
          defaultValue={currentTenantId}
          onChange={onChange}
          disabled={pending}
          className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 hover:border-zinc-600 focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </form>
    </div>
  );
}
