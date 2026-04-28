/**
 * Force dark theme on the marketing/landing page regardless of tenant settings.
 * This script runs synchronously before paint so there's no flash.
 */
export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.dataset.theme='dark';",
        }}
      />
      {children}
    </>
  );
}
