"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminNotificationBell } from "./admin-notification-bell";

const STORAGE_KEY = "when_sidebar_expanded_v1";

// ── Icons (18 × 18 inline SVG) ────────────────────────────────────────────

function IcHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IcCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IcGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
/** Universal "services / offerings" — tag icon */
function IcTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
/** Staff / employees — briefcase */
function IcBriefcase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" />
      <path d="M2 12h20" />
    </svg>
  );
}
/** Clients / customers — person */
function IcPerson() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IcSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IcPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IcLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IcChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IcChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IcMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// ── Nav structure ─────────────────────────────────────────────────────────

type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };

const NAV_MAIN: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <IcHome />, exact: true },
  { href: "/admin/harmonogram", label: "Harmonogram", icon: <IcCalendar /> },
  { href: "/admin/grafik", label: "Grafik", icon: <IcGrid /> },
];

const NAV_MANAGE: NavItem[] = [
  { href: "/admin/uslugi", label: "Usługi", icon: <IcTag /> },
  { href: "/admin/pracownicy", label: "Pracownicy", icon: <IcBriefcase /> },
  { href: "/admin/klienci", label: "Klienci", icon: <IcPerson /> },
  { href: "/admin/ustawienia", label: "Ustawienia", icon: <IcSettings /> },
];

// ── Single nav link ───────────────────────────────────────────────────────

function SidebarLink({
  item,
  expanded,
  pathname,
  onClick,
}: {
  item: NavItem;
  expanded: boolean;
  pathname: string;
  onClick?: () => void;
}) {
  const active = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={!expanded ? item.label : undefined}
      className={`relative flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-accent)]" />
      )}
      <span className="shrink-0">{item.icon}</span>
      <span
        className={`ml-3 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ${
          expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}

// ── Shared sidebar body (reused for desktop + mobile drawer) ──────────────

function SidebarBody({
  expanded,
  businessName,
  logoUrl,
  tenantId,
  logoutAction,
  onToggle,
  pathname,
  onNavClick,
}: {
  expanded: boolean;
  businessName: string;
  logoUrl?: string;
  tenantId: string;
  logoutAction: () => Promise<void>;
  onToggle: () => void;
  pathname: string;
  onNavClick?: () => void;
}) {
  // Sidebar pixel width — used to position the notification side panel
  const sidebarPx = expanded ? 220 : 60;

  return (
    <div className="flex h-full flex-col">

      {/* ── Top: toggle + name (text only when no logo) ── */}
      <div className="flex h-14 shrink-0 items-center border-b border-zinc-800/60 px-3">
        <button
          type="button"
          onClick={onToggle}
          title={expanded ? "Zwiń" : "Rozwiń"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
        >
          {expanded ? <IcChevronLeft /> : <IcChevronRight />}
        </button>
        {!logoUrl && (
          <span
            className={`ml-2 overflow-hidden transition-[max-width,opacity] duration-200 ${
              expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            <span className="whitespace-nowrap text-sm font-semibold text-zinc-100">
              {businessName}
            </span>
          </span>
        )}
      </div>

      {/* ── Logo zone (own section, visible when expanded + logo set) ── */}
      {logoUrl && (
        <div
          className={`shrink-0 overflow-hidden transition-[max-height,opacity] duration-200 ${
            expanded ? "max-h-28 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-3 my-3 overflow-hidden rounded-xl">
            <Image
              src={logoUrl}
              alt={businessName}
              width={200}
              height={90}
              className="w-full h-[90px] object-cover object-center"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* ── CTA: new booking ── */}
      <div className="shrink-0 px-3 py-3">
        <Link
          href="/admin/rezerwacja/nowa"
          onClick={onNavClick}
          title={!expanded ? "Nowa rezerwacja" : undefined}
          className="flex h-9 w-full items-center justify-center rounded-lg bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-accent-fg)] transition-opacity hover:opacity-85"
        >
          <span className="shrink-0"><IcPlus /></span>
          {expanded && (
            <span className="ml-2 whitespace-nowrap">Nowa rezerwacja</span>
          )}
        </Link>
      </div>

      {/* ── Main nav ── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-1">
        {NAV_MAIN.map((item) => (
          <SidebarLink key={item.href} item={item} expanded={expanded} pathname={pathname} onClick={onNavClick} />
        ))}

        <div className="my-2 mx-1 border-t border-zinc-800/60" />

        {NAV_MANAGE.map((item) => (
          <SidebarLink key={item.href} item={item} expanded={expanded} pathname={pathname} onClick={onNavClick} />
        ))}
      </nav>

      {/* ── Bottom: notifications + logout ── */}
      <div className="shrink-0 border-t border-zinc-800/60 px-2 py-3 space-y-0.5">
        <AdminNotificationBell
          tenantId={tenantId}
          panelLeft={sidebarPx}
          navMode
          sidebarExpanded={expanded}
        />

        <form action={logoutAction}>
          <button
            type="submit"
            title={!expanded ? "Wyloguj" : undefined}
            className="flex h-10 w-full items-center rounded-lg px-3 text-sm text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"
          >
            <span className="shrink-0"><IcLogout /></span>
            <span
              className={`ml-3 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ${
                expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              Wyloguj
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────

export function AdminSidebar({
  tenantId,
  businessName,
  logoUrl,
  logoutAction,
}: {
  tenantId: string;
  businessName: string;
  logoUrl?: string;
  logoutAction: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Hydrate from localStorage after mount (avoid SSR flash)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setExpanded(saved === "true");
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function toggleExpanded() {
    setExpanded((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside
        className={`hidden md:block shrink-0 border-r border-zinc-800/60 bg-zinc-900 transition-[width] duration-200 ease-in-out ${
          expanded ? "w-[220px]" : "w-[60px]"
        }`}
        style={{ position: "sticky", top: 0, height: "100vh" }}
      >
        <SidebarBody
          expanded={expanded}
          businessName={businessName}
          logoUrl={logoUrl}
          tenantId={tenantId}
          logoutAction={logoutAction}
          onToggle={toggleExpanded}
          pathname={pathname}
        />
      </aside>

      {/* ── Mobile: top bar + slide-in drawer ────────────────────── */}
      <div className="md:hidden">
        {/* Slim top bar */}
        <div className="fixed left-0 right-0 top-0 z-[250] flex h-12 items-center justify-between border-b border-zinc-800/60 bg-zinc-900/95 px-3 backdrop-blur">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
            aria-label="Menu"
          >
            <IcMenu />
          </button>
          {logoUrl ? (
            <div className="h-9 w-28 overflow-hidden rounded-lg">
              <Image src={logoUrl} alt={businessName} width={112} height={36} className="w-full h-full object-cover object-center" unoptimized />
            </div>
          ) : (
            <span className="text-sm font-semibold text-zinc-100">{businessName}</span>
          )}
          <div className="flex items-center gap-1">
            <Link
              href="/admin/rezerwacja/nowa"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
              aria-label="Nowa rezerwacja"
            >
              <IcPlus />
            </Link>
            {/* Bell in compact mode (no navMode) — shows legacy dropdown on mobile */}
            <AdminNotificationBell tenantId={tenantId} />
          </div>
        </div>

        {/* Backdrop */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[260] bg-black/60" onClick={() => setMobileOpen(false)} />
        )}

        {/* Drawer */}
        <aside
          className={`fixed bottom-0 left-0 top-0 z-[270] w-[220px] bg-zinc-900 transition-transform duration-200 ease-in-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarBody
            expanded={true}
            businessName={businessName}
            logoUrl={logoUrl}
            tenantId={tenantId}
            logoutAction={logoutAction}
            onToggle={() => setMobileOpen(false)}
            pathname={pathname}
            onNavClick={() => setMobileOpen(false)}
          />
        </aside>
      </div>
    </>
  );
}
