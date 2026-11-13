import "server-only";
import { z } from "zod";
import * as blog from "@/features/blog/bot";
import { BlogError } from "@/features/blog/errors";
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
      await blog.checkKey(apiKey, false);
      const [totals, countries, cities, specialisms, posts] = await Promise.all([
        getTotals(),
        getCountries(),
        getTopCities(25),
        getSpecialisms(),
        blog.listPosts(apiKey, { limit: 500 }),
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
];
