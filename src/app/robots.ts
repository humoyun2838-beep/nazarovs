import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/nazarov", "/materials", "/b/", "/m/"],
      disallow: ["/admin"],
    },
    sitemap: "https://www.nazarov.uz/sitemap.xml",
    host: "https://www.nazarov.uz",
  };
}
