import "server-only";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/site";

/**
 * The address to put in emailed links. On the live site this is always
 * recruiterlink.com. On a Vercel preview it is that preview's own address,
 * and on a developer's machine it is localhost, so links come back to the
 * place the person started. It is never taken from anything a visitor can
 * set on the live site.
 */
export async function linkOrigin(): Promise<string> {
  const env = process.env.VERCEL_ENV;
  if (env === "production") return siteUrl;
  if (env === "preview" && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = (await headers()).get("host") ?? "";
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  return siteUrl;
}

/** The visitor's IP address as Vercel reports it, for rate limiting only. */
export async function visitorIp(): Promise<string | null> {
  const list = await headers();
  const ip = (list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}
