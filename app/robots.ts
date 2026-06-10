import type { MetadataRoute } from "next"

const SITE_URL = "https://splitsimple.anuragd.me"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Admin is private; shared bills (/b/) hold user financial data and are
      // intentionally noindex; API routes return no indexable content.
      disallow: ["/admin", "/b/", "/api/", "/og-image"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
