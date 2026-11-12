export const siteName = "RecruiterLink";

export const siteDescription =
  "The global directory of recruitment agencies.";

/**
 * The one public address of the site, used for canonical links, sitemaps and
 * structured data. No "www" and no trailing slash: this is the form the old
 * site used in its canonical links and sitemaps, so search engines keep the
 * address they already know.
 */
export const siteUrl = "https://recruiterlink.com";

/** Full public address for a path such as "/spain/madrid". */
export function absoluteUrl(path = "/"): string {
  return path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`;
}

/**
 * Whether search engines and AI crawlers may index this deployment.
 *
 * Off by default, so preview and pre-launch deployments can never compete
 * with the live site in search results. Switched on by setting
 * SITE_INDEXABLE=true for the Production environment in Vercel at launch.
 */
export const isIndexable = process.env.SITE_INDEXABLE === "true";
