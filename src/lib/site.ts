export const siteName = "RecruiterLink";

export const siteDescription =
  "The global directory of recruitment agencies.";

/**
 * Whether search engines and AI crawlers may index this deployment.
 *
 * Off by default, so preview and pre-launch deployments can never compete
 * with the live site in search results. Switched on by setting
 * SITE_INDEXABLE=true for the Production environment in Vercel at launch.
 */
export const isIndexable = process.env.SITE_INDEXABLE === "true";
