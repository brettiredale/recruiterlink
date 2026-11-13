import "server-only";
import { lookup } from "node:dns/promises";
import sharp from "sharp";
import { getFirecrawlKey, getLogoDevKey } from "@/lib/env";
import { isFetchableAddress, isPrivateAddress, unwrapImageAddress } from "./logo-address";

// Finds a logo for a new listing: first the agency's own website (Firecrawl's
// branding read), then logo.dev. Every result is redrawn here as a PNG, so no
// file from another site is stored as it came (SVG included).

export type FoundLogo = { bytes: Uint8Array; source: "website" | "logo.dev" };

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const STORED_MAX_BYTES = 1024 * 1024;
/** Smaller than this on both sides is a favicon, not a logo. */
const MIN_SIDE = 48;

export async function findAgencyLogo(website: string, domain: string): Promise<FoundLogo | null> {
  for (const address of await websiteLogoAddresses(website)) {
    const logo = await prepare(await fetchImage(address));
    if (logo) return { bytes: logo, source: "website" };
  }
  const logoDev = logoDevAddress(domain);
  if (logoDev) {
    const logo = await prepare(await fetchImage(logoDev));
    if (logo) return { bytes: logo, source: "logo.dev" };
  }
  return null;
}

/** The logo addresses Firecrawl reads from the page, best first. */
async function websiteLogoAddresses(website: string): Promise<string[]> {
  const key = getFirecrawlKey();
  if (!key) return [];
  try {
    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: website, formats: ["branding"], onlyMainContent: false }),
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Firecrawl branding read failed:", response.status);
      return [];
    }
    const json = (await response.json()) as {
      data?: { branding?: { logo?: unknown; images?: Record<string, unknown> } };
    };
    const branding = json.data?.branding;
    // images.logoAlt is the logo's alt text, not an address.
    const found = [branding?.images?.logo, branding?.logo];
    const addresses: string[] = [];
    for (const value of found) {
      if (typeof value !== "string" || !value) continue;
      if (value.startsWith("data:")) {
        if (!addresses.includes(value)) addresses.push(value);
        continue;
      }
      const url = unwrapImageAddress(value, website);
      if (url && !addresses.includes(url.href)) addresses.push(url.href);
    }
    return addresses;
  } catch (error) {
    console.error("Firecrawl branding read failed:", error);
    return [];
  }
}

function logoDevAddress(domain: string): string | null {
  const token = getLogoDevKey();
  if (!token) return null;
  const params = new URLSearchParams({
    token,
    size: "256",
    format: "png",
    theme: "light",
    retina: "true",
    fallback: "404",
  });
  return `https://img.logo.dev/${encodeURIComponent(domain)}?${params}`;
}

/** Downloads an image, refusing private addresses and anything too large. */
async function fetchImage(address: string): Promise<Uint8Array | null> {
  if (address.startsWith("data:")) return decodeDataAddress(address);
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return null;
  }
  try {
    // Redirects are followed by hand so each new address is checked too.
    for (let hop = 0; hop < 4; hop++) {
      if (!(await isPublicAddress(url))) return null;
      const response = await fetch(url, {
        redirect: "manual",
        headers: { Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8" },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (response.status >= 300 && response.status < 400) {
        const next = response.headers.get("location");
        if (!next) return null;
        url = new URL(next, url);
        continue;
      }
      if (!response.ok || !response.body) return null;
      const declared = Number(response.headers.get("content-length") ?? 0);
      if (declared > IMAGE_MAX_BYTES) return null;
      return await readLimited(response.body);
    }
  } catch (error) {
    console.error("Logo download failed:", url.host, error instanceof Error ? error.message : error);
  }
  return null;
}

async function isPublicAddress(url: URL): Promise<boolean> {
  if (!isFetchableAddress(url)) return false;
  try {
    const answers = await lookup(url.hostname, { all: true });
    return answers.length > 0 && answers.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

async function readLimited(body: ReadableStream<Uint8Array>): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > IMAGE_MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function decodeDataAddress(address: string): Uint8Array | null {
  const match = /^data:image\/[a-z0-9.+-]+((?:;[^;,]*)*),([\s\S]*)$/i.exec(address);
  if (!match) return null;
  const base64 = /;base64$/i.test(match[1]);
  const bytes = base64 ? Buffer.from(match[2], "base64") : Buffer.from(decodeURIComponent(match[2]), "utf8");
  return bytes.byteLength > 0 && bytes.byteLength <= IMAGE_MAX_BYTES ? new Uint8Array(bytes) : null;
}

/**
 * Redraws the image as a PNG of at most 512 px, or returns null when it is
 * not a usable logo: unreadable, favicon-sized, a photograph, or (like a
 * white logo made for a dark header) next to invisible on the site's white cards.
 */
async function prepare(input: Uint8Array | null): Promise<Uint8Array | null> {
  if (!input) return null;
  try {
    const image = sharp(input, { limitInputPixels: 40_000_000, density: 300 });
    const meta = await image.metadata();
    if (!meta.width || !meta.height) return null;
    if (meta.width < MIN_SIDE && meta.height < MIN_SIDE && meta.format !== "svg") return null;

    if (!(await looksLikeLogo(input))) return null;

    // The site shows logos in a rounded square. A solid square icon fills
    // it; anything else gets a clear margin so the corners do not clip it.
    const ratio = meta.width / meta.height;
    const fillsSquare = !meta.hasAlpha && ratio > 0.9 && ratio < 1.1;
    for (const side of [512, 320]) {
      const inner = fillsSquare ? side : Math.round(side * 0.84);
      const fitted = await sharp(input, { limitInputPixels: 40_000_000, density: 300 })
        .resize(inner, inner, { fit: "inside", withoutEnlargement: meta.format !== "svg" })
        .png()
        .toBuffer({ resolveWithObject: true });
      const { width, height } = fitted.info;
      const square = fillsSquare ? Math.max(width, height) : Math.round(Math.max(width, height) / 0.84);
      const left = Math.floor((square - width) / 2);
      const top = Math.floor((square - height) / 2);
      const png = await sharp(fitted.data)
        .extend({
          left,
          right: square - width - left,
          top,
          bottom: square - height - top,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png({ compressionLevel: 9 })
        .toBuffer();
      if (png.byteLength <= STORED_MAX_BYTES) return new Uint8Array(png);
    }
  } catch (error) {
    console.error("Logo image unreadable:", error instanceof Error ? error.message : error);
  }
  return null;
}

/**
 * True when the picture reads as a logo on white. Measured on a 96 px copy:
 * - with a see-through background, at least 30% of the drawn part must stand
 *   out from white (a white logo for a dark header fails, even with a
 *   coloured dot);
 * - with a solid background, at least 1.5% of it must differ from white;
 * - more than 250 distinct colours means a photograph (a banner Firecrawl
 *   took for the logo), not a logo.
 */
async function looksLikeLogo(input: Uint8Array): Promise<boolean> {
  const { data } = await sharp(input, { limitInputPixels: 40_000_000, density: 150 })
    .ensureAlpha()
    .resize(96, 96, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = data.length / 4;
  let seeThrough = 0;
  let drawn = 0;
  let drawnVisible = 0;
  let visible = 0;
  const colours = new Set<number>();
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    const onWhite = (c: number) => c * alpha + 255 * (1 - alpha);
    const light = 0.299 * onWhite(data[i]) + 0.587 * onWhite(data[i + 1]) + 0.114 * onWhite(data[i + 2]);
    const stands = light < 215;
    if (stands) visible++;
    if (data[i + 3] < 32) {
      seeThrough++;
    } else {
      drawn++;
      if (stands) drawnVisible++;
      colours.add(((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4));
    }
  }
  if (colours.size > 250) return false;
  if (seeThrough / pixels >= 0.05) return drawn > 0 && drawnVisible / drawn >= 0.3;
  return visible / pixels >= 0.015;
}
