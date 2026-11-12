import { cx } from "./cx";
import { LogoPhoto } from "./LogoPhoto";

const LOGO_BASE =
  "https://ipfjjrngsjixgbmkezzg.supabase.co/storage/v1/object/public/agency-logos/";

/** Full public address of a logo file in the `agency-logos` bucket. */
export function logoUrl(file: string): string {
  return LOGO_BASE + encodeURIComponent(file);
}

/** Up to two initials from an agency name, e.g. "Blu Selection" gives "BS". */
export function initialsFor(name: string): string {
  const words = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Background and text pairs from the palette. All pass 4.5:1 contrast.
const PLACEHOLDER_TONES = [
  "bg-navy text-white",
  "bg-indigo text-white",
  "bg-lavender text-navy",
  "bg-pink-tint text-navy",
  "bg-cream text-navy",
  "bg-pink text-navy",
] as const;

/** The same name always gets the same placeholder colour. */
export function placeholderTone(name: string): string {
  let hash = 0;
  for (const char of name.trim().toLowerCase()) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return PLACEHOLDER_TONES[hash % PLACEHOLDER_TONES.length];
}

export type LogoImageProps = {
  /** Agency name. Used for the alt text and for the initials placeholder. */
  name: string;
  /**
   * File name in the `agency-logos` bucket, e.g. "<agency id>.jpg".
   * Leave empty (or null) for agencies without a logo.
   */
  file?: string | null;
  /** Width and height in pixels. 68 on cards, 112 on the featured card. */
  size?: number;
  /** Load straight away rather than when scrolled into view. */
  eager?: boolean;
  className?: string;
};

/**
 * Square agency logo with rounded corners. Shows coloured initials when the
 * agency has no logo, or when its logo file cannot be loaded.
 */
export function LogoImage({ name, file, size = 68, eager, className }: LogoImageProps) {
  const large = size >= 96;
  return (
    <span
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden font-heading font-extrabold tracking-[-0.03em] select-none",
        "shadow-logo",
        large ? "rounded-logo-lg" : "rounded-logo",
        placeholderTone(name),
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      <span aria-hidden="true">{initialsFor(name)}</span>
      {file ? (
        <LogoPhoto src={logoUrl(file)} alt={`${name} logo`} size={size} eager={eager} />
      ) : null}
    </span>
  );
}
