import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/projects", "/blueprint"] }],
    sitemap: "https://nexora-product.vercel.app/sitemap.xml",
  };
}
