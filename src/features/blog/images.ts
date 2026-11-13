import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BlogError } from "./errors";
import { IMAGE_MAX_BYTES, isPrivateIp, sniffImage } from "./image-check";

/**
 * Blog pictures live in our own public storage bucket (`blog-images`), so
 * neither the owner nor Grokbot needs another image host, and pictures never
 * disappear because another site removed them. Every file is checked by its
 * content and stored under a new random name. Files are never deleted here:
 * any post may still show them.
 *
 * Call only after the caller has been confirmed (a site admin, or a live
 * API key): this uses the secret key.
 */
const BUCKET = "blog-images";

export async function storeBlogImage(bytes: Uint8Array): Promise<{ url: string }> {
  if (bytes.length === 0) throw new BlogError("invalid", "The image is empty.", 400);
  if (bytes.length > IMAGE_MAX_BYTES) throw new BlogError("too_large", "The image is too large (8 MB at most).", 413);
  const kind = sniffImage(bytes);
  if (!kind) throw new BlogError("invalid", "Only PNG, JPEG, WebP and GIF images can be used.", 415);

  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${kind.ext}`;
  const storage = getSupabaseAdminClient().storage.from(BUCKET);
  const { error } = await storage.upload(path, bytes, {
    contentType: kind.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("Blog image upload failed:", error.message);
    throw new BlogError("server_error", "The image could not be stored. Please try again.", 500);
  }
  return { url: storage.getPublicUrl(path).data.publicUrl };
}

/** Refuses anything but public https, so the server cannot be pointed at its own network. */
async function assertPublicHttps(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlogError("invalid", "image_url is not a valid address.", 400);
  }
  if (url.protocol !== "https:") throw new BlogError("invalid", "image_url must start with https://.", 400);
  if (url.username || url.password) throw new BlogError("invalid", "image_url must not contain a user name or password.", 400);
  if (url.port && url.port !== "443") throw new BlogError("invalid", "image_url must use the normal https port.", 400);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new BlogError("invalid", `Could not find the site ${host}.`, 400);
  if (addresses.some((a) => isPrivateIp(a.address))) {
    throw new BlogError("invalid", "image_url must point to a public website.", 400);
  }
  return url;
}

/** Downloads an image from a public https address (at most 8 MB, 3 redirects). */
export async function fetchRemoteImage(raw: string): Promise<Uint8Array> {
  let url = await assertPublicHttps(raw);
  for (let hop = 0; hop <= 3; hop++) {
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
        headers: { accept: "image/png,image/jpeg,image/webp,image/gif;q=0.9,*/*;q=0.1" },
      });
    } catch {
      throw new BlogError("fetch_failed", "Could not download the image (the site did not answer in time).", 400);
    }
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) throw new BlogError("fetch_failed", "The image address redirected nowhere.", 400);
      url = await assertPublicHttps(new URL(next, url).toString());
      continue;
    }
    if (!response.ok || !response.body) {
      throw new BlogError("fetch_failed", `Could not download the image (the site answered ${response.status}).`, 400);
    }
    if (Number(response.headers.get("content-length") ?? 0) > IMAGE_MAX_BYTES) {
      throw new BlogError("too_large", "The image is too large (8 MB at most).", 413);
    }
    // Read with a hard limit, in case the size header is missing or wrong.
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > IMAGE_MAX_BYTES) {
        await reader.cancel();
        throw new BlogError("too_large", "The image is too large (8 MB at most).", 413);
      }
      chunks.push(value);
    }
    return new Uint8Array(Buffer.concat(chunks));
  }
  throw new BlogError("fetch_failed", "The image address redirected too many times.", 400);
}
