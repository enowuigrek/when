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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.whenbooking.pl";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "WHEN — system rezerwacji online",
    template: "%s | WHEN",
  },
  description:
    "System rezerwacji online dla salonów, gabinetów i studiów. Postaw demo w 30 sekund — bez rejestracji, bez karty. Widget na stronę, panel managera, baza klientów.",
  applicationName: "WHEN",
  keywords: [
    "system rezerwacji online",
    "rezerwacje online",
    "rezerwacje dla salonu",
    "rezerwacje dla barbera",
    "rezerwacje dla gabinetu",
    "rezerwacje dla fryzjera",
    "kalendarz rezerwacji",
    "widget rezerwacji",
    "booking system",
    "umawianie wizyt online",
  ],
  authors: [{ name: "Łukasz Nowak", url: "https://lukasznowak.dev" }],
  creator: "Łukasz Nowak",
  publisher: "WHEN",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: SITE_URL,
    siteName: "WHEN",
    title: "WHEN — system rezerwacji online",
    description:
      "Postaw demo w 30 sekund — bez rejestracji. Widget na stronę, panel managera, baza klientów. Dla barberów, gabinetów, studiów.",
  },
  twitter: {
    card: "summary_large_image",
    title: "WHEN — system rezerwacji online",
    description:
      "Postaw demo w 30 sekund — bez rejestracji. Dla salonów, gabinetów i studiów.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
