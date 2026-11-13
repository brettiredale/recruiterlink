// Checks on image addresses found on an agency's website, before the server
// fetches them. Kept free of server-only imports so the tests can load it.

/**
 * Next.js and Vercel serve resized images as `/_next/image?url=<original>`.
 * Firecrawl reports that wrapper; the original file is the better one.
 */
export function unwrapImageAddress(address: string, page: string): URL | null {
  let url: URL;
  try {
    url = new URL(address, page);
  } catch {
    return null;
  }
  if (/\/_(next|vercel)\/image\/?$/.test(url.pathname)) {
    const inner = url.searchParams.get("url");
    if (inner) {
      try {
        url = new URL(inner, url);
      } catch {
        return null;
      }
    }
  }
  return url;
}

/** True for an IPv4 or IPv6 address that is private, local or reserved. */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/i, "");
  const parts = v4.split(".").map(Number);
  if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("ff")
  );
}

/** Only ordinary web addresses on public host names, on the usual ports. */
export function isFetchableAddress(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }
  // A bare IP address is allowed only when it is public.
  if (/^[\d.]+$/.test(host) || host.includes(":")) return !isPrivateAddress(host);
  return host.includes(".");
}
