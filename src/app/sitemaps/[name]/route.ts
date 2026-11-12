import { SITEMAP_HEADERS, sitemapUrls, urlsetXml } from "@/lib/sitemaps";

/** One sitemap file, e.g. /sitemaps/cities.xml or /sitemaps/agencies-2.xml. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/sitemaps/[name]">,
) {
  const { name } = await params;
  const urls = name.endsWith(".xml") ? await sitemapUrls(name.slice(0, -4)) : null;
  if (!urls) return new Response("Not found\n", { status: 404 });
  return new Response(urlsetXml(urls), { headers: SITEMAP_HEADERS });
}
