import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "WHEN — system rezerwacji online",
  description: "Zobacz swój salon w działającym demo — bez rejestracji.",
};

/**
 * Root layout: always dark by default. Tenant-aware routes
 * (/admin/*, /rezerwacja/*, /widget/*) wrap themselves in a
 * <div data-theme={tenant.theme}> via their own layouts.
 * This keeps the marketing page (/) immune to cookie tenant theme.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pl"
      data-theme="dark"
      suppressHydrationWarning
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
