import "server-only";
import { z } from "zod";
import * as blog from "@/features/blog/bot";
import { BlogError } from "@/features/blog/errors";
import * as listings from "@/features/listings/bot";
import { getCountries, getSpecialisms, getTopCities, getTotals } from "@/lib/directory";
import {
  blogPath,
  cityPath,
  countriesPath,
  countryPath,
  forAgenciesPath,
  specialismPath,
  specialismsPath,
} from "@/lib/routes";
import { siteUrl } from "@/lib/site";
import { isGenericSpecialism } from "@/lib/specialisms";

/**
 * The connector's tools. `args` is both the JSON Schema shown to the agent
 * and the check run on what it sends.
 */
export type McpTool = {
  name: string;
  title: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: z.ZodType<any>;
  write?: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (apiKey: string, args: any) => Promise<unknown>;
};

function tool<S extends z.ZodType>(def: Omit<McpTool, "args" | "run"> & {
  args: S;
  run: (apiKey: string, args: z.infer<S>) => Promise<unknown>;
}): McpTool {
  return def as McpTool;
}

export const TOOLS: McpTool[] = [
  tool({
    name: "get_site_overview",
    title: "Site overview",
    description:
      "What RecruiterLink holds right now and the real page addresses to link to from articles: totals, the largest countries and cities, the specialisms, and how many blog posts exist. Call this first.",
    args: z.object({}),
    async run(apiKey) {
      // Listing the posts checks the key (and counts this one call).
      const posts = await blog.listPosts(apiKey, { limit: 500 });
      const [totals, countries, cities, specialisms] = await Promise.all([
        getTotals(),
        getCountries(),
        getTopCities(25),
        getSpecialisms(),
      ]);
      return {
        site: siteUrl,
        totals: {
          agencies: totals.agencyCount,
          countries: totals.countryCount,
          cities: totals.cityCount,
          specialisms: totals.specialismCount,
        },
        blog: {
          published: posts.posts.filter((p) => p.status === "published").length,
          drafts: posts.posts.filter((p) => p.status === "draft").length,
          index: blogPath,
        },
        pages: {
          countries_list: countriesPath,
          specialisms_list: specialismsPath,
          search: "/search?q=<words>, e.g. /search?q=IT+recruiters+in+Madrid",
          for_agencies: forAgenciesPath,
          city_specialism_pattern: "/<country>/<city>/<specialism>, e.g. /spain/madrid/information-technology",
        },
        largest_countries: countries
          .filter((c) => c.agencyCount > 0)
          .slice(0, 15)
          .map((c) => ({ name: c.name, agencies: c.agencyCount, path: countryPath(c.slug) })),
        largest_cities: cities.map((c) => ({
          name: `${c.name}, ${c.country.name}`,
          agencies: c.agencyCount,
          path: cityPath(c.country.slug, c.slug),
        })),
        specialisms: specialisms
          .filter((s) => s.agencyCount > 0 && !isGenericSpecialism(s.slug))
          .map((s) => ({ name: s.name, slug: s.slug, agencies: s.agencyCount, path: specialismPath(s.slug) })),
      };
    },
  }),

  tool({
    name: "list_blog_posts",
    title: "List blog posts",
    description:
      "The blog's posts, drafts included, most recently changed first. Check this before writing so you never repeat a topic, title or slug.",
    args: blog.ListArgs,
    async run(apiKey, a) {
      const { count, posts } = await blog.listPosts(apiKey, a);
      return {
        count,
        format: "published_at | status | slug | title | tags",
        posts: posts.map(
          (p) => `${p.published_at.slice(0, 10)} | ${p.status} | ${p.slug} | ${p.title} | ${p.tags.join(", ")}`,
        ),
      };
    },
  }),

  tool({
    name: "get_blog_post",
    title: "Get blog post",
    description: "Read one blog post in full, including its markdown, by slug.",
    args: blog.GetArgs,
    run: (apiKey, a) => blog.getPost(apiKey, a.post_slug),
  }),

  tool({
    name: "create_blog_post",
    title: "Create blog post",
    description:
      "Write a new blog post. status 'published' puts it live at once at /blog/<slug>; 'draft' keeps it hidden for Brett to review in the admin pages. Returns the slug and live address.",
    args: blog.CreateArgs,
    write: true,
    run: (apiKey, a) => blog.createPost(apiKey, a),
  }),

  tool({
    name: "update_blog_post",
    title: "Update blog post",
    description:
      "Change a blog post by its slug. Send only the fields to change. status 'draft' takes a post off the site (the safe way to remove it); 'published' puts a draft live.",
    args: blog.UpdateArgs,
    write: true,
    idempotent: true,
    run: (apiKey, a) => blog.updatePost(apiKey, a),
  }),

  tool({
    name: "delete_blog_post",
    title: "Delete blog post",
    description:
      "Delete a blog post for good. Its address stops working. Only when Brett asks for a post to be deleted; to take a post off the site otherwise, use update_blog_post with status 'draft'. Send the slug twice (post_slug and confirm_slug).",
    args: blog.DeleteArgs,
    write: true,
    destructive: true,
    async run(apiKey, a) {
      if (a.post_slug !== a.confirm_slug) {
        throw new BlogError("invalid", "confirm_slug must be the same as post_slug. Nothing was deleted.", 400);
      }
      return blog.deletePost(apiKey, a.post_slug);
    },
  }),

  tool({
    name: "upload_blog_image",
    title: "Upload blog image",
    description:
      "Store an image on RecruiterLink's own image host and get back a permanent https address. Use it for every picture in an article and every cover: pictures on other hosts can disappear. PNG, JPEG, WebP or GIF, at most 8 MB from an address. Returns url and a ready markdown line.",
    args: blog.UploadArgs,
    write: true,
    run: (apiKey, a) => blog.uploadImage(apiKey, a),
  }),

  // -------------------------------------------------------------------------
  // Agency listings
  // -------------------------------------------------------------------------

  tool({
    name: "get_listing_options",
    title: "Listing options",
    description:
      "The countries (with their region codes) and specialism slugs a listing can use. Call once before adding listings, and pass only these values.",
    args: z.object({}),
    run: (apiKey) => listings.listingOptions(apiKey),
  }),

  tool({
    name: "find_agency_listings",
    title: "Find agency listings",
    description:
      "Check whether agencies are already listed, before adding them: pass up to 200 websites (each comes back listed true/false with its listings) and/or words in a name. Never add an agency whose website is already listed.",
    args: listings.FindArgs,
    run: (apiKey, a) => listings.findListings(apiKey, a),
  }),

  tool({
    name: "get_agency_listing",
    title: "Get agency listing",
    description: "One listing in full by its slug: text, city, specialisms, plan (free or premium) and whether the agency has claimed it.",
    args: listings.GetArgs,
    run: (apiKey, a) => listings.getListing(apiKey, a.agency_slug),
  }),

  tool({
    name: "create_agency_listing",
    title: "Add agency listing",
    description:
      "Add one recruitment agency to the directory. It is live at once at /agencies/<slug>, free unless premium=true. The logo is found on the agency's website by itself. Refused (already_listed) when the website is already listed.",
    args: listings.CreateArgs,
    write: true,
    run: (apiKey, a) => listings.createListing(apiKey, a),
  }),

  tool({
    name: "create_agency_listings",
    title: "Add agency listings (up to 25)",
    description:
      "Add up to 25 agencies in one call; each is added or refused on its own and the result says which. The quickest way to do the daily batch. Each listing counts as one write (30 a minute).",
    args: listings.CreateManyArgs,
    write: true,
    run: (apiKey, a) => listings.createListings(apiKey, a),
  }),

  tool({
    name: "update_agency_listing",
    title: "Update agency listing",
    description:
      "Fix a listing by its slug, sending only what changes. Listings an agency has claimed belong to that agency and cannot be changed here.",
    args: listings.UpdateArgs,
    write: true,
    idempotent: true,
    run: (apiKey, a) => listings.updateListing(apiKey, a),
  }),

  tool({
    name: "set_agency_premium",
    title: "Give or remove Premium",
    description:
      "premium=true gives a listing Premium with no payment (for example a Lovelio client), and it stays Premium until set back. premium=false takes a given Premium away. Premium an agency pays for itself is never changed. Only when Brett asks.",
    args: listings.PremiumArgs,
    write: true,
    idempotent: true,
    run: (apiKey, a) => listings.setPremium(apiKey, a),
  }),

  tool({
    name: "refresh_agency_logo",
    title: "Find agency logo again",
    description: "Look for the agency's logo again (its website, then logo.dev) and store it. For listings not claimed by their agency.",
    args: listings.LogoArgs,
    write: true,
    idempotent: true,
    run: (apiKey, a) => listings.refreshLogo(apiKey, a.agency_slug),
  }),
];
