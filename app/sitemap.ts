import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.whenbooking.pl";

/**
 * Public sitemap. We only list the marketing page — tenant-specific
 * widgets and admin panels are private and blocked in robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
