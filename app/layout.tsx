import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/db/settings";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
  const theme = s.theme ?? "system";
  const accent = s.color_accent ?? "#d4a26a";
  const accentHover = accent;

  const resolvedTheme = theme === "system" ? "dark" : theme;

  return (
    <html
      lang="pl"
      data-theme={resolvedTheme}
      data-theme-pref={theme}
      suppressHydrationWarning
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
      style={{ "--accent": accent, "--accent-hover": accentHover } as React.CSSProperties}
    >
      <head>
        {theme === "system" && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{var d=document.documentElement;var m=window.matchMedia('(prefers-color-scheme: dark)');function set(){d.dataset.theme=m.matches?'dark':'light';}set();m.addEventListener('change',set);}catch(e){}})();",
            }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
