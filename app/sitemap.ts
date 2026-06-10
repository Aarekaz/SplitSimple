import type { MetadataRoute } from "next"

const SITE_URL = "https://splitsimple.anuragd.me"

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the homepage is indexable today. Admin, /b/ shared bills, /og-image,
  // and API routes are intentionally excluded (see robots.ts). Add new public
  // content/landing pages here as they ship.
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ]
}
