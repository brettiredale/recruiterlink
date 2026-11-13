import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexable } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Before launch: keep every crawler out, and point at no sitemap.
  if (!isIndexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    // Account and admin pages are private, so crawlers are kept out of them.
    // Search result pages are left crawlable on purpose: they carry a
    // "noindex" that crawlers can only obey if they are allowed to read it.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/account", "/admin"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
