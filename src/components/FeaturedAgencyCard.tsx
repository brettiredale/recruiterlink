import Link from "next/link";
import { formatLocation } from "./AgencyCard";
import { cx } from "./cx";
import { PinIcon } from "./icons";
import { LogoImage } from "./LogoImage";
import { PremiumBadge } from "./PremiumBadge";

export type FeaturedAgencyCardProps = {
  name: string;
  /** Address of the agency's profile page. */
  href: string;
  city?: string | null;
  country?: string | null;
  /** File name in the `agency-logos` bucket, or null when there is no logo. */
  logoFile?: string | null;
  /** One short sentence about the agency. */
  summary?: string | null;
  specialisms?: string[];
  maxSpecialisms?: number;
  premium?: boolean;
  /** Small print above the button, e.g. what Premium profiles include. */
  note?: string | null;
  headingLevel?: "h2" | "h3";
  className?: string;
};

/** The large navy-to-indigo card that leads the featured agencies on the home page. */
export function FeaturedAgencyCard({
  name,
  href,
  city,
  country,
  logoFile,
  summary,
  specialisms = [],
  maxSpecialisms = 4,
  premium = true,
  note,
  headingLevel: Heading = "h3",
  className,
}: FeaturedAgencyCardProps) {
  const location = formatLocation(city, country);
  const shown = specialisms.slice(0, maxSpecialisms);

  return (
    <article
      className={cx(
        "on-dark group relative flex min-w-0 flex-col gap-4 rounded-feature bg-[linear-gradient(160deg,var(--color-navy),var(--color-indigo))] p-6 text-white sm:p-9",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <LogoImage
          name={name}
          file={logoFile}
          size={112}
          eager
          className="max-sm:!h-[88px] max-sm:!w-[88px]"
        />
        {premium ? <PremiumBadge /> : null}
      </div>

      <Heading className="mt-2 font-heading text-[30px] leading-[1.08] font-extrabold tracking-[-0.03em] [overflow-wrap:anywhere] sm:text-4xl">
        <Link
          href={href}
          className="outline-none after:absolute after:inset-0 after:rounded-feature focus-visible:after:outline-[3px] focus-visible:after:outline-offset-2 focus-visible:after:outline-white"
        >
          {name}
        </Link>
      </Heading>

      {location ? (
        <p className="flex items-center gap-1.5 text-base font-semibold text-on-navy">
          <PinIcon className="shrink-0" />
          {location}
        </p>
      ) : null}

      {summary ? <p className="max-w-[440px] text-lg text-on-navy">{summary}</p> : null}

      {shown.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Specialisms">
          {shown.map((tag) => (
            <li
              key={tag}
              className="max-w-full truncate rounded-full border border-white/35 bg-white/15 px-[13px] py-[7px] text-sm font-semibold"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto flex flex-col items-start gap-4 pt-2">
        {note ? (
          <p className="w-full border-t border-white/30 pt-[18px] text-[15px] text-on-navy">
            {note}
          </p>
        ) : null}
        <span
          aria-hidden="true"
          className="inline-flex min-h-11 items-center rounded-btn bg-pink px-[26px] py-[13px] text-[19px] leading-tight font-bold text-white transition-colors group-hover:bg-pink-hover"
        >
          View profile
        </span>
      </div>
    </article>
  );
}
