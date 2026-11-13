/**
 * Image checks shared by the browser upload and the server. Plain code with
 * no imports, so it can be tested with Node's own test runner.
 */

/** Largest file the server will store (the storage bucket's own limit). */
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Largest file a browser or agent may send in one request. The hosting
 * platform refuses request bodies over 4.5 MB, so the admin editor shrinks
 * bigger pictures before sending them.
 */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

export type ImageKind = { ext: "png" | "jpg" | "webp" | "gif"; mime: string };

/**
 * What a file really is, from its first bytes (never from its name or the
 * type it claims). Only PNG, JPEG, WebP and GIF; SVG is refused because it
 * can carry script.
 */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const at = (i: number) => bytes[i];
  if (bytes.length >= 8 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) {
    return { ext: "png", mime: "image/png" };
  }
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    bytes.length >= 12 &&
    at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  if (
    bytes.length >= 6 &&
    at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38 &&
    (at(4) === 0x37 || at(4) === 0x39) && at(5) === 0x61
  ) {
    return { ext: "gif", mime: "image/gif" };
  }
  return null;
}

/** The 8 groups of an IPv6 address as numbers, or null if it is not one. */
function ipv6Groups(ip: string): number[] | null {
  let text = ip.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  // A dotted IPv4 tail ("::ffff:10.0.0.1") becomes two hex groups.
  const tail = text.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (tail) {
    const [a, b, c, d] = tail.slice(1).map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return null;
    text = text.slice(0, -tail[0].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const parts = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  if (parts.length !== 8 || parts.some((p) => !/^[0-9a-f]{1,4}$/.test(p))) return null;
  return parts.map((p) => parseInt(p, 16));
}

function privateV4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

/**
 * True for addresses that are private, local, reserved, or that hide an
 * IPv4 address inside IPv6 (mapped, compatible, NAT64, 6to4) in any spelling.
 * Anything that cannot be read as an address counts as private.
 */
export function isPrivateIp(ip: string): boolean {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return privateV4(ip);
  const g = ipv6Groups(ip);
  if (!g) return true;
  const firstFiveZero = g.slice(0, 5).every((n) => n === 0);
  // ::ffff:a.b.c.d (mapped) and ::a.b.c.d (compatible), including :: and ::1.
  if (firstFiveZero && (g[5] === 0xffff || g[5] === 0)) return true;
  if (g[0] === 0x64 && g[1] === 0xff9b) return true; // NAT64
  if (g[0] === 0x2002) return true; // 6to4
  if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo
  if ((g[0] & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // link local
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  return false;
}
