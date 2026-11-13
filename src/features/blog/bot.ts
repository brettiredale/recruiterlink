import "server-only";
import { z } from "zod";
import { refreshBlog } from "@/lib/revalidate";
import { blogPostPath } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BlogError, blogErrorFrom } from "./errors";
import { UPLOAD_MAX_BYTES } from "./image-check";
import { fetchRemoteImage, storeBlogImage } from "./images";
import {
  ALT_MAX,
  AUTHOR_MAX,
  EXCERPT_MAX,
  SLUG_MAX,
  TAG_MAX,
  TAGS_MAX,
  TITLE_MAX,
  URL_MAX,
  agentBodyProblem,
  validatePost,
  type PostErrors,
  type PostInput,
} from "./rules";

/**
 * Everything the owner's AI agent (Grokbot) can do with the blog. The MCP
 * connector (/api/mcp) and the REST API (/api/v1/blog) are two doors onto
 * these same functions, so they always behave alike.
 *
 * The API key is passed to the database with every call; the database
 * checks it, applies the per-key limits and records who made each change.
 * The server itself holds no special power here (it uses the publishable
 * key), except for storing image files after the key has been checked.
 */

// ---------------------------------------------------------------------------
// Argument shapes (shown to the agent as JSON Schema, and checked at run time)
// ---------------------------------------------------------------------------

const Status = z
  .enum(["draft", "published"])
  .describe('"published" puts the post live at once. "draft" saves it hidden, for Brett to review in the admin pages.');

export const PostFields = {
  title: z.string().trim().min(10).max(TITLE_MAX).describe("Headline. 45 to 65 characters is best for Google."),
  excerpt: z
    .string()
    .trim()
    .min(50)
    .max(EXCERPT_MAX)
    .describe("Summary shown on the blog page and in Google. 140 to 160 characters."),
  body_markdown: z
    .string()
    .min(300)
    .max(60_000)
    .describe(
      "The article in markdown: ## and ### headings, paragraphs split by a blank line, **bold**, *italic*, [links](https://… or /spain/madrid), - or 1. lists, > quotes, images as ![alt text](https://…) on their own line (add a caption with ![alt](https://… \"Caption\")), and a YouTube or Vimeo address alone on its own line to embed the video. No raw HTML. Do not repeat the title as a heading.",
    ),
  slug: z
    .string()
    .trim()
    .max(SLUG_MAX)
    .optional()
    .describe("Web address of the post (/blog/<slug>). Leave out to make one from the title."),
  tags: z
    .array(z.string().max(TAG_MAX))
    .max(TAGS_MAX)
    .optional()
    .describe("2 to 5 topic tags, for example ['Hiring', 'Recruitment agencies']."),
  author: z.string().trim().max(AUTHOR_MAX).optional().describe("Byline. Leave out to publish as RecruiterLink."),
  cover_image_url: z
    .string()
    .trim()
    .url()
    .max(URL_MAX)
    .optional()
    .describe("https address of the cover picture (16:9 works best, at least 1600 pixels wide). Store it with upload_blog_image first."),
  cover_image_alt: z
    .string()
    .trim()
    .max(ALT_MAX)
    .optional()
    .describe("Short description of the cover picture, for people who cannot see it."),
};

export const CreateArgs = z.object({ ...PostFields, status: Status });

export const UpdateArgs = z.object({
  post_slug: z.string().trim().min(1).describe("Slug of the post to change (from list_blog_posts)."),
  title: PostFields.title.optional(),
  excerpt: PostFields.excerpt.optional(),
  body_markdown: PostFields.body_markdown.optional(),
  new_slug: PostFields.slug.describe("A new web address. The old address keeps working and redirects to the new one."),
  tags: PostFields.tags,
  author: PostFields.author.or(z.literal("")),
  cover_image_url: PostFields.cover_image_url.or(z.literal("")).describe("New cover address, or \"\" to remove the cover."),
  cover_image_alt: PostFields.cover_image_alt,
  status: Status.optional().describe('"draft" takes a post off the site; "published" puts a draft live (its date becomes now).'),
});

export const DeleteArgs = z.object({
  post_slug: z.string().trim().min(1).describe("Slug of the post to delete."),
  confirm_slug: z.string().trim().min(1).describe("Type the slug again to confirm. Deleting cannot be undone from here."),
});

export const ListArgs = z.object({
  status: z.enum(["draft", "published"]).optional().describe("Only posts with this status."),
  limit: z.number().int().min(1).max(500).optional().describe("Default 60, newest changes first."),
});

export const GetArgs = z.object({ post_slug: z.string().trim().min(1) });

export const UploadArgs = z
  .object({
    image_url: z
      .string()
      .trim()
      .url()
      .max(URL_MAX)
      .optional()
      .describe("Public https address of the image to copy in, for example an image you just generated."),
    image_base64: z
      .string()
      .max(Math.ceil((UPLOAD_MAX_BYTES * 4) / 3) + 64)
      .optional()
      .describe("The image itself as base64 (a data: address is fine). Only if you have no address; at most about 3 MB of image."),
    alt: z.string().trim().max(ALT_MAX).optional().describe("Short description of the image, used in the markdown line returned."),
  })
  .refine((a) => Boolean(a.image_url) !== Boolean(a.image_base64), {
    message: "Send exactly one of image_url or image_base64.",
  });

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

type DbPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author: string | null;
  tags: string[];
  status: "draft" | "published";
  published_at: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  words: number;
  body_markdown?: string;
};

function shape(post: DbPost) {
  return {
    slug: post.slug,
    title: post.title,
    status: post.status,
    url: post.status === "published" ? absoluteUrl(blogPostPath(post.slug)) : null,
    excerpt: post.excerpt,
    tags: post.tags,
    author: post.author,
    cover_image_url: post.cover_image_url,
    cover_image_alt: post.cover_image_alt,
    words: post.words,
    published_at: post.published_at,
    updated_at: post.updated_at,
    updated_by: post.updated_by,
  };
}

export type BotPost = ReturnType<typeof shape>;

function invalid(errors: PostErrors): BlogError {
  const [field, message] = Object.entries(errors)[0] ?? ["", "Invalid post."];
  const names: Partial<Record<keyof PostInput, string>> = {
    bodyMarkdown: "body_markdown",
    coverImageUrl: "cover_image_url",
    coverImageAlt: "cover_image_alt",
    publishedAt: "published_at",
  };
  const name = names[field as keyof PostInput] ?? field;
  return new BlogError("invalid", `${name}: ${message}`, 400, name);
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

const db = () => getSupabaseServerClient();

async function findPost(apiKey: string, slug: string): Promise<DbPost> {
  const { data, error } = await db().rpc("bot_get_blog_post", { api_key: apiKey, post_slug: slug });
  if (error) throw blogErrorFrom(error);
  if (!data) throw new BlogError("not_found", `No blog post has the slug "${slug}". Call list_blog_posts to see them.`, 404);
  return data as unknown as DbPost;
}

async function save(apiKey: string, id: string | null, basedOn: string | null, input: PostInput): Promise<DbPost> {
  const checked = validatePost(input);
  if (!checked.ok) throw invalid(checked.errors);
  const post = checked.post;
  const { data, error } = await db().rpc("bot_save_blog_post", {
    api_key: apiKey,
    // The database makes a new post when there is no id.
    target: id as string,
    // The version the change was based on; null for a new post.
    expected_updated_at: basedOn as string,
    new_slug: post.slug,
    new_title: post.title,
    new_excerpt: post.excerpt,
    new_body: post.bodyMarkdown,
    new_cover_url: post.coverImageUrl ?? "",
    new_cover_alt: post.coverImageAlt,
    new_author: post.author,
    new_tags: post.tags,
    new_status: post.status,
    new_published_at: post.publishedAt,
  });
  if (error) throw blogErrorFrom(error);
  refreshBlog();
  return data as unknown as DbPost;
}

/** Checks the key (and counts the call) without doing anything else. */
export async function checkKey(apiKey: string, isWrite: boolean): Promise<{ name: string }> {
  const { data, error } = await db().rpc("bot_check_key", { api_key: apiKey, is_write: isWrite });
  if (error) throw blogErrorFrom(error);
  return data as unknown as { name: string };
}

export async function listPosts(apiKey: string, args: z.infer<typeof ListArgs>) {
  const { data, error } = await db().rpc("bot_list_blog_posts", {
    api_key: apiKey,
    only_status: args.status as string,
    max_rows: args.limit ?? 60,
  });
  if (error) throw blogErrorFrom(error);
  const posts = (data as unknown as DbPost[]).map(shape);
  return { count: posts.length, posts };
}

export async function getPost(apiKey: string, slug: string) {
  const post = await findPost(apiKey, slug);
  return { ...shape(post), body_markdown: post.body_markdown ?? "" };
}

export async function createPost(apiKey: string, args: z.infer<typeof CreateArgs>) {
  const problem = agentBodyProblem(args.body_markdown);
  if (problem) throw new BlogError("invalid", `body_markdown: ${problem}`, 400, "body_markdown");
  const saved = await save(apiKey, null, null, {
    title: args.title,
    slug: args.slug ?? "",
    excerpt: args.excerpt,
    bodyMarkdown: args.body_markdown,
    coverImageUrl: args.cover_image_url ?? "",
    coverImageAlt: args.cover_image_alt ?? "",
    author: args.author ?? "",
    tags: args.tags ?? [],
    status: args.status,
    publishedAt: new Date().toISOString(),
  });
  return { created: true, ...shape(saved) };
}

export async function updatePost(apiKey: string, args: z.infer<typeof UpdateArgs>) {
  const current = await findPost(apiKey, args.post_slug);
  if (args.body_markdown !== undefined) {
    const problem = agentBodyProblem(args.body_markdown);
    if (problem) throw new BlogError("invalid", `body_markdown: ${problem}`, 400, "body_markdown");
  }
  const status = args.status ?? current.status;
  // A draft going live is dated now, so it tops the blog.
  const goingLive = status === "published" && current.status !== "published";
  const saved = await save(apiKey, current.id, current.updated_at, {
    title: args.title ?? current.title,
    slug: args.new_slug ?? current.slug,
    excerpt: args.excerpt ?? current.excerpt,
    bodyMarkdown: args.body_markdown ?? current.body_markdown ?? "",
    coverImageUrl: args.cover_image_url ?? current.cover_image_url ?? "",
    coverImageAlt: args.cover_image_alt ?? (args.cover_image_url === "" ? "" : (current.cover_image_alt ?? "")),
    author: args.author ?? current.author ?? "",
    tags: args.tags ?? current.tags,
    status,
    publishedAt: goingLive ? new Date().toISOString() : current.published_at,
  });
  const result = { updated: true, ...shape(saved) };
  return args.new_slug && saved.slug !== current.slug
    ? { ...result, old_url_redirects_from: absoluteUrl(blogPostPath(current.slug)) }
    : result;
}

export async function deletePost(apiKey: string, slug: string) {
  const current = await findPost(apiKey, slug);
  const { error } = await db().rpc("bot_delete_blog_post", { api_key: apiKey, target: current.id });
  if (error) throw blogErrorFrom(error);
  refreshBlog();
  return { deleted: true, slug: current.slug, title: current.title };
}

export async function uploadImage(apiKey: string, args: z.infer<typeof UploadArgs>) {
  await checkKey(apiKey, true);
  let bytes: Uint8Array;
  if (args.image_url) {
    bytes = await fetchRemoteImage(args.image_url);
  } else {
    const raw = args.image_base64!.trim();
    const prefix = raw.match(/^data:[\w/+.-]+;base64,/)?.[0] ?? "";
    bytes = new Uint8Array(Buffer.from(raw.slice(prefix.length), "base64"));
  }
  return uploadBytes(bytes, args.alt);
}

/** Stores image bytes once the key has been checked; returns its address and a markdown line. */
export async function uploadBytes(bytes: Uint8Array, alt?: string) {
  const { url } = await storeBlogImage(bytes);
  const text = (alt ?? "").replace(/[[\]\n]/g, " ").trim();
  return { url, markdown: `![${text}](${url})` };
}
