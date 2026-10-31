import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // áreas de conta e admin não interessam ao Google
      disallow: ["/admin", "/perfil", "/wishlist", "/favoritar", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
