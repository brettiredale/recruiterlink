import "server-only";
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { get as httpsGet } from "node:https";
import { isIP, type LookupFunction } from "node:net";
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

/** Checks an address before any connection: public https only. */
function parsePublicHttps(raw: string): URL {
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
  if (isIP(host) && isPrivateIp(host)) throw new BlogError("invalid", "image_url must point to a public website.", 400);
  return url;
}

const BLOCKED = "image_url must point to a public website.";

/**
 * Looks a host name up and refuses private addresses. Used by the
 * connection itself, so the address checked is the address connected to
 * (a site cannot answer one address to a check and another to the download).
 */
const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true, verbatim: true })
    .then((addresses) => {
      const list = addresses as LookupAddress[];
      if (list.length === 0) throw Object.assign(new Error(`Could not find the site ${hostname}.`), { code: "ENOTFOUND" });
      if (list.some((a) => isPrivateIp(a.address))) throw Object.assign(new Error(BLOCKED), { code: "EBLOCKED" });
      if (options.all) callback(null, list);
      else callback(null, list[0].address, list[0].family);
    })
    .catch((error: NodeJS.ErrnoException) => callback(error, "", 0));
};

type Hop = { status: number; location: string | null; body: Uint8Array | null };

function getOnce(url: URL): Promise<Hop> {
  return new Promise((resolve, reject) => {
    const request = httpsGet(
      url,
      {
        lookup: publicLookup,
        headers: { accept: "image/png,image/jpeg,image/webp,image/gif;q=0.9,*/*;q=0.1", "user-agent": "RecruiterLink-blog-images/1.0" },
        timeout: 15_000,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          response.resume();
          resolve({ status, location: response.headers.location ?? null, body: null });
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          resolve({ status, location: null, body: null });
          return;
        }
        if (Number(response.headers["content-length"] ?? 0) > IMAGE_MAX_BYTES) {
          response.destroy();
          reject(new BlogError("too_large", "The image is too large (8 MB at most).", 413));
          return;
        }
        // Read with a hard limit, in case the size header is missing or wrong.
        const chunks: Buffer[] = [];
        let total = 0;
        response.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > IMAGE_MAX_BYTES) {
            response.destroy();
            reject(new BlogError("too_large", "The image is too large (8 MB at most).", 413));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve({ status, location: null, body: new Uint8Array(Buffer.concat(chunks)) }));
        response.on("error", reject);
      },
    );
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", (error: NodeJS.ErrnoException) => {
      if (error instanceof BlogError) reject(error);
      else if (error.code === "EBLOCKED") reject(new BlogError("invalid", BLOCKED, 400));
      else if (error.code === "ENOTFOUND") reject(new BlogError("invalid", `Could not find the site ${url.hostname}.`, 400));
      else reject(new BlogError("fetch_failed", "Could not download the image (the site did not answer properly).", 400));
    });
  });
}

/** Downloads an image from a public https address (at most 8 MB, 3 redirects). */
export async function fetchRemoteImage(raw: string): Promise<Uint8Array> {
  let url = parsePublicHttps(raw);
  for (let hop = 0; hop <= 3; hop++) {
    const result = await getOnce(url);
    if (result.status >= 300 && result.status < 400) {
      if (!result.location) throw new BlogError("fetch_failed", "The image address redirected nowhere.", 400);
      url = parsePublicHttps(new URL(result.location, url).toString());
      continue;
    }
    if (!result.body) {
      throw new BlogError("fetch_failed", `Could not download the image (the site answered ${result.status}).`, 400);
    }
    return result.body;
  }
  throw new BlogError("fetch_failed", "The image address redirected too many times.", 400);
}
