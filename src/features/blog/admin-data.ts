import "server-only";
import { getSupabaseSessionClient } from "@/lib/supabase/session";
import { blogErrorFrom } from "./errors";

/** A post as the admin pages see it (drafts included). */
export type AdminPost = {
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

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_by: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

/** Every post, newest change first. Throws unless the person is a site admin. */
export async function listAdminPosts(): Promise<AdminPost[]> {
  const { data, error } = await (await getSupabaseSessionClient()).rpc("admin_list_blog_posts");
  if (error) throw blogErrorFrom(error);
  return data as unknown as AdminPost[];
}

/** One post with its article, or null. */
export async function getAdminPost(id: string): Promise<AdminPost | null> {
  const { data, error } = await (await getSupabaseSessionClient()).rpc("admin_get_blog_post", { target: id });
  if (error) throw blogErrorFrom(error);
  return (data as unknown as AdminPost | null) ?? null;
}

export async function listApiKeys(): Promise<ApiKeyRow[]> {
  const { data, error } = await (await getSupabaseSessionClient()).rpc("admin_list_api_keys");
  if (error) throw blogErrorFrom(error);
  return data as unknown as ApiKeyRow[];
}
