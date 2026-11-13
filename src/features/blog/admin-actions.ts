"use server";

import { createHash, randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { parseUuid } from "@/features/account/validate";
import { refreshBlog } from "@/lib/revalidate";
import { getSupabaseSessionClient } from "@/lib/supabase/session";
import { blogErrorFrom } from "./errors";
import { cleanLine, validatePost, type PostErrors, type PostInput } from "./rules";

/**
 * What the admin pages can do. Each call acts as the signed-in person, and
 * the database refuses anyone who is not on the site admin list, so these
 * functions never trust the browser about who is asking.
 */

export type SaveResult =
  | { ok: true; id: string; slug: string; status: "draft" | "published"; updatedAt: string }
  | { ok: false; message: string; errors?: PostErrors };

const TRY_AGAIN = "Sorry, that did not save. Please try again in a minute.";
const SIGNED_OUT = "Your sign-in has ended. Sign in again in a new tab, then come back here and save: nothing on this page is lost.";

/** The message for a refusal from the database. */
function refusal(status: number, message: string): string {
  // Only admins reach these pages, so a refusal means the sign-in ended.
  if (status === 401 || status === 403) return SIGNED_OUT;
  return status >= 500 ? TRY_AGAIN : message;
}

function asInput(value: unknown): PostInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const text = (key: string) => (typeof v[key] === "string" ? (v[key] as string) : "");
  return {
    title: text("title"),
    slug: text("slug"),
    excerpt: text("excerpt"),
    bodyMarkdown: text("bodyMarkdown"),
    coverImageUrl: text("coverImageUrl"),
    coverImageAlt: text("coverImageAlt"),
    author: text("author"),
    tags: Array.isArray(v.tags) ? v.tags.filter((t): t is string => typeof t === "string") : [],
    status: v.status === "published" ? "published" : "draft",
    publishedAt: text("publishedAt"),
  };
}

/** Creates (no id) or updates a post. */
export async function savePost(id: string | null, value: unknown): Promise<SaveResult> {
  const input = asInput(value);
  const target = id === null ? null : parseUuid(id);
  if (!input || (id !== null && !target)) return { ok: false, message: TRY_AGAIN };

  const checked = validatePost(input);
  if (!checked.ok) {
    return { ok: false, message: "Please check the highlighted fields.", errors: checked.errors };
  }
  const post = checked.post;

  try {
    const supabase = await getSupabaseSessionClient();
    const { data, error } = await supabase.rpc("admin_save_blog_post", {
      // The database makes a new post when there is no id.
      target: target as string,
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
    if (error) {
      const problem = blogErrorFrom(error);
      if (problem.code === "slug_taken") {
        return {
          ok: false,
          message: "Please check the highlighted fields.",
          errors: { slug: "Another post already uses this web address. Change it slightly." },
        };
      }
      return { ok: false, message: refusal(problem.status, problem.message) };
    }
    const saved = data as unknown as { id: string; slug: string; status: "draft" | "published"; updated_at: string };
    refreshBlog();
    return { ok: true, id: saved.id, slug: saved.slug, status: saved.status, updatedAt: saved.updated_at };
  } catch (error) {
    console.error("savePost failed:", error);
    return { ok: false, message: TRY_AGAIN };
  }
}

/** Deletes a post for good (the database keeps a private copy). */
export async function deletePost(id: string): Promise<{ ok: boolean; message?: string }> {
  const target = parseUuid(id);
  if (!target) return { ok: false, message: TRY_AGAIN };
  try {
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.rpc("admin_delete_blog_post", { target });
    if (error) {
      const problem = blogErrorFrom(error);
      return { ok: false, message: refusal(problem.status, problem.message) };
    }
    refreshBlog();
    return { ok: true };
  } catch (error) {
    console.error("deletePost failed:", error);
    return { ok: false, message: TRY_AGAIN };
  }
}

// ---------------------------------------------------------------------------
// API keys for Grokbot
// ---------------------------------------------------------------------------

export type CreateKeyState =
  | { step: "form"; name?: string; error?: string }
  | { step: "created"; name: string; key: string };

/**
 * Makes a new key. Only its fingerprint (SHA-256) and first characters are
 * stored; the key itself is shown once, on the page that made it.
 */
export async function createApiKey(_previous: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const name = cleanLine(formData.get("name")).slice(0, 60);
  if (!name) return { step: "form", error: "Give the key a name, for example Grokbot." };

  const key = `rl_live_${randomBytes(24).toString("base64url")}`;
  try {
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.rpc("admin_create_api_key", {
      key_name: name,
      new_key_prefix: key.slice(0, 12),
      new_key_hash: createHash("sha256").update(key).digest("hex"),
    });
    if (error) {
      const problem = blogErrorFrom(error);
      return { step: "form", name, error: refusal(problem.status, problem.message) };
    }
  } catch (error) {
    console.error("createApiKey failed:", error);
    return { step: "form", name, error: TRY_AGAIN };
  }
  refresh();
  return { step: "created", name, key };
}

/** Stops a key working, at once and for good. */
export async function revokeApiKey(formData: FormData): Promise<void> {
  const target = parseUuid(formData.get("key_id"));
  if (!target) return;
  const supabase = await getSupabaseSessionClient();
  const { error } = await supabase.rpc("admin_revoke_api_key", { target });
  if (error) console.error("revokeApiKey failed:", error.code, error.message);
  refresh();
}
