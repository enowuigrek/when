import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/db/settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s.tagline
    ? `${s.business_name} — ${s.tagline}`
    : s.business_name;
  return {
    title: { default: title, template: `%s | ${s.business_name}` },
    description: s.description ?? undefined,
    openGraph: {
      title: s.business_name,
      description: s.description ?? undefined,
      locale: "pl_PL",
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const s = await getSettings();
  const theme = s.theme ?? "dark";
  const accent = s.color_accent ?? "#d4a26a";
  const accentHover = accent; // close enough for now

  return (
    <html
      lang="pl"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ "--accent": accent, "--accent-hover": accentHover } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
