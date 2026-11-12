import { SITEMAP_HEADERS, sitemapIndexXml, sitemapNames } from "@/lib/sitemaps";

/** The sitemap index: lists every sitemap file under /sitemaps/. */
export async function GET() {
  return new Response(sitemapIndexXml(await sitemapNames()), { headers: SITEMAP_HEADERS });
}
