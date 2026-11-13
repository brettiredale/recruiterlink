/**
 * Cached readers for the public blog pages. Only published posts can be read
 * (the database's rule for the public), and each read is the same for every
 * visitor. Everything is tagged `blog`, so a change made in the admin pages,
 * the API or the connector refreshes it at once (`refreshBlog`).
 */
import { cacheLife, cacheTag } from "next/cache";
import { BLOG_TAG } from "@/lib/cache-tags";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { POSTS_PER_PAGE } from "./rules";

export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  author: string | null;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
};

export type PublicPost = PostSummary & { bodyMarkdown: string };

const SUMMARY_COLUMNS =
  "slug,title,excerpt,cover_image_url,cover_image_alt,author,tags,published_at,updated_at,word_count";

type SummaryRow = {
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author: string | null;
  tags: string[];
  published_at: string;
  updated_at: string;
  word_count: number;
};

function toSummary(row: SummaryRow): PostSummary {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImageUrl: row.cover_image_url,
    coverImageAlt: row.cover_image_alt,
    author: row.author,
    tags: row.tags ?? [],
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingMinutes: Math.max(1, Math.round((row.word_count ?? 0) / 200)),
  };
}

function fail(what: string, error: { message: string }): never {
  // Thrown, never treated as "no posts", so an outage is not cached as an
  // empty blog or a 404.
  throw new Error(`Blog ${what} failed: ${error.message}`);
}

/** One page of the blog, newest first, with the number of posts in all. */
export async function getBlogPage(page: number): Promise<{ posts: PostSummary[]; total: number }> {
  "use cache";
  cacheLife("days");
  cacheTag(BLOG_TAG);
  const from = (page - 1) * POSTS_PER_PAGE;
  const { data, error, count } = await getSupabaseServerClient()
    .from("blog_posts")
    .select(SUMMARY_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("slug")
    .range(from, from + POSTS_PER_PAGE - 1);
  if (error?.code === "PGRST103") {
    // Asked for a page past the end: no posts on it, but say how many exist.
    const counted = await getSupabaseServerClient()
      .from("blog_posts")
      .select("slug", { count: "exact", head: true })
      .eq("status", "published");
    if (counted.error) fail("count", counted.error);
    return { posts: [], total: counted.count ?? 0 };
  }
  if (error) fail("list", error);
  return { posts: (data as SummaryRow[]).map(toSummary), total: count ?? 0 };
}

/** The newest posts, for the home page and "More articles". */
export async function getRecentPosts(limit: number): Promise<PostSummary[]> {
  "use cache";
  cacheLife("days");
  cacheTag(BLOG_TAG);
  const { data, error } = await getSupabaseServerClient()
    .from("blog_posts")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("slug")
    .limit(limit);
  if (error) fail("recent list", error);
  return (data as SummaryRow[]).map(toSummary);
}

/** One published post, or null. */
export async function getPublishedPost(slug: string): Promise<PublicPost | null> {
  "use cache";
  cacheLife("days");
  cacheTag(BLOG_TAG);
  const { data, error } = await getSupabaseServerClient()
    .from("blog_posts")
    .select(`${SUMMARY_COLUMNS},body_markdown`)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail("post", error);
  if (!data) return null;
  const row = data as SummaryRow & { body_markdown: string };
  return { ...toSummary(row), bodyMarkdown: row.body_markdown };
}

/** The current slug of a post that used to live at `oldSlug`, or null. */
export async function getRenamedPostSlug(oldSlug: string): Promise<string | null> {
  "use cache";
  cacheLife("days");
  cacheTag(BLOG_TAG);
  const { data, error } = await getSupabaseServerClient()
    .from("blog_slug_redirects")
    .select("blog_posts(slug)")
    .eq("old_slug", oldSlug)
    .maybeSingle();
  if (error) fail("redirect", error);
  const post = (data as { blog_posts: { slug: string } | null } | null)?.blog_posts;
  return post?.slug ?? null;
}

/** Every published post's address and last change, for the sitemap. */
export async function getBlogSitemapEntries(): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheLife("days");
  cacheTag(BLOG_TAG);
  const { data, error } = await getSupabaseServerClient()
    .from("blog_posts")
    .select("slug,updated_at,word_count")
    .eq("status", "published")
    .gt("word_count", 0)
    .order("published_at", { ascending: false })
    .limit(5000);
  if (error) fail("sitemap", error);
  return (data as { slug: string; updated_at: string }[]).map((row) => ({
    slug: row.slug,
    updatedAt: row.updated_at,
  }));
}
