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

/** True for addresses inside private, local or reserved IP ranges. */
export function isPrivateIp(ip: string): boolean {
  const v4 = (address: string) => {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return v4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return v4(mapped[1]);
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || /^ff/.test(v6) || v6.startsWith("64:ff9b:");
}
