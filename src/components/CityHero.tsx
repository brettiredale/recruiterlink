import Image from "next/image";
import { cx } from "./cx";

export type CityHeroProps = {
  /** The page's main heading, e.g. "Recruitment agencies in Madrid". */
  title: string;
  /** Small label above the heading, e.g. "73 agencies · Spain". */
  eyebrow?: string;
  /** One or two sentences under the heading. */
  intro?: string;
  /**
   * City photo. `src` is a path in /public or a full address on a host
   * allowed in next.config.ts. Leave out for cities without a photo.
   */
  photo?: { src: string; alt: string } | null;
  /** Shows the small "AI-generated image" label on the photo. */
  aiGenerated?: boolean;
  className?: string;
};

// Designed fallback for cities without a photo: the brand gradient with soft
// light blooms and faint rings, so the panel never looks like a missing image.
const fallbackBackground = [
  "radial-gradient(circle at 88% 12%, rgba(255, 139, 211, 0.55), transparent 42%)",
  "radial-gradient(circle at 70% 115%, rgba(255, 62, 181, 0.35), transparent 45%)",
  "repeating-radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.09) 0 1.5px, transparent 1.5px 56px)",
  "linear-gradient(160deg, #21174B 10%, #4C57E6 78%, #7A83F0 110%)",
].join(", ");

/**
 * City page hero: a rounded panel filled with the city photo under a dark
 * gradient, with the heading over it. Falls back to a designed gradient.
 */
export function CityHero({
  title,
  eyebrow,
  intro,
  photo,
  aiGenerated = true,
  className,
}: CityHeroProps) {
  return (
    <div
      className={cx(
        "on-dark relative isolate flex min-h-[360px] flex-col justify-end overflow-hidden rounded-panel bg-navy p-6 text-white sm:min-h-[420px] sm:p-10 lg:p-[52px]",
        className,
      )}
      style={photo ? undefined : { backgroundImage: fallbackBackground }}
    >
      {photo ? (
        <>
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            preload
            sizes="(min-width: 1258px) 1210px, 100vw"
            className="-z-20 object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(33,23,75,0.96)_0%,rgba(33,23,75,0.86)_40%,rgba(33,23,75,0.4)_78%,rgba(33,23,75,0.35)_100%)]"
          />
          {aiGenerated ? (
            <p className="label-mono absolute top-4 right-4 rounded-[6px] bg-navy/75 px-2.5 py-1.5 text-[11px] tracking-[0.1em] text-white backdrop-blur-sm sm:top-5 sm:right-5">
              AI-generated image
            </p>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col gap-3.5 pt-16">
        {eyebrow ? (
          <p className="label-mono text-[13px] text-pink-soft sm:text-sm">{eyebrow}</p>
        ) : null}
        <h1 className="font-heading text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance">
          {title}
        </h1>
        {intro ? (
          <p className="max-w-[640px] text-lg text-on-navy sm:text-xl">{intro}</p>
        ) : null}
      </div>
    </div>
  );
}
