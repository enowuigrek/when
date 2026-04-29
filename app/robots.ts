import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.whenbooking.pl";

/**
 * Crawler rules for search engines. The marketing page (/) is fully
 * indexable; everything tenant-specific or transactional is blocked
 * because it leaks customer data, requires auth, or has unstable URLs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/widget/",
          "/rezerwacja/",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
