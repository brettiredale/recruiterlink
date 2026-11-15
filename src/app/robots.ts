import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexable } from "@/lib/site";

// Account, admin and API addresses are private or not pages.
const DISALLOW = ["/api/", "/account", "/admin"];

// AI assistants and answer engines, named so the welcome is explicit. A named
// group replaces "*" for that crawler, so it carries the same disallow list.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  // Before launch: keep every crawler out, and point at no sitemap.
  if (!isIndexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    // Account and admin pages are private, so crawlers are kept out of them.
    // Search result pages are left crawlable on purpose: they carry a
    // "noindex" that crawlers can only obey if they are allowed to read it.
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
