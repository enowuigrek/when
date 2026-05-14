import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Functions that read the admin session cookie (`when_admin`) to resolve the
 * current tenant. Allowed only in admin routes — using them on public pages
 * leaks the admin's tenant data to visitors. Public/widget code must use
 * either the `*ForTenant(tenantId)` variants (explicit) or the `getMain*()`
 * variants (root-domain tenant).
 */
const restrictedTenantImports = {
  paths: [
    {
      name: "@/lib/db/settings",
      importNames: ["getSettings", "getTimeFilters", "getAllTimeFilters"],
      message:
        "Reads admin session — would leak tenant on public pages. Use getMainSettings() or getSettingsForTenant(id).",
    },
    {
      name: "@/lib/db/services",
      importNames: ["getServices", "getServiceBySlug", "getServiceById", "getBusinessHours"],
      message:
        "Reads admin session — would leak tenant on public pages. Use getMain*() or *ForTenant(id) variants.",
    },
    {
      name: "@/lib/db/staff",
      importNames: [
        "getActiveStaff",
        "getAllStaff",
        "getStaffById",
        "createStaff",
        "updateStaff",
        "toggleStaffActive",
        "deleteStaff",
        "getStaffServiceIds",
        "setStaffServices",
      ],
      message:
        "Reads admin session — would leak tenant on public pages. Use getMainActiveStaff() or *ForTenant(id) variants.",
    },
    {
      name: "@/lib/db/bookings",
      importNames: ["getBookingsInRange"],
      message:
        "Reads admin session. Use getBookingsInRangeForTenant(..., tenantId) on public/widget code.",
    },
    {
      name: "@/lib/db/staff-schedule",
      importNames: ["getStaffAvailabilityMap"],
      message:
        "Reads admin session. Use getStaffAvailabilityMapForTenant(..., tenantId) on public/widget code.",
    },
    {
      name: "@/lib/tenant",
      importNames: ["getAdminTenantId", "getAdminTenantSlug", "getAdminTenantKind"],
      message:
        "Reads admin session cookie — only admin code may use it. Public/widget code derives tenant from URL slug (getTenantIdBySlug) or MAIN_TENANT_ID.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Prevent admin-session-aware DB calls from leaking onto public pages.
  // Admin routes are excluded — they legitimately use the session.
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["app/admin/**", "app/api/admin/**"],
    rules: {
      "no-restricted-imports": ["error", restrictedTenantImports],
    },
  },
]);

export default eslintConfig;
