import Link from "next/link";
import { cx } from "./cx";
import { ArrowRightIcon, PinIcon } from "./icons";
import { LogoImage } from "./LogoImage";
import { PremiumBadge } from "./PremiumBadge";

export type AgencyCardProps = {
  name: string;
  /** Address of the agency's profile page. */
  href: string;
  city?: string | null;
  country?: string | null;
  /** File name in the `agency-logos` bucket, or null when there is no logo. */
  logoFile?: string | null;
  /** Specialism names shown as tags. */
  specialisms?: string[];
  /** How many tags to show before "+N more". */
  maxSpecialisms?: number;
  premium?: boolean;
  /** Heading level for the agency name, to suit the page outline. */
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
};

export function formatLocation(city?: string | null, country?: string | null) {
  return [city, country].filter(Boolean).join(", ");
}

/** Standard agency card. The whole card is one link to the profile. */
export function AgencyCard({
  name,
  href,
  city,
  country,
  logoFile,
  specialisms = [],
  maxSpecialisms = 3,
  premium = false,
  headingLevel: Heading = "h3",
  className,
}: AgencyCardProps) {
  const location = formatLocation(city, country);
  const shown = specialisms.slice(0, maxSpecialisms);
  const extra = specialisms.length - shown.length;

  return (
    <article
      className={cx(
        "group relative flex min-w-0 flex-col gap-2.5 rounded-card border border-line bg-white p-[22px] transition duration-200",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card",
        "focus-within:border-indigo",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <LogoImage name={name} file={logoFile} size={68} />
        {premium ? <PremiumBadge /> : null}
      </div>

      <Heading className="mt-1 font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.02em] [overflow-wrap:anywhere]">
        <Link
          href={href}
          className="outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:outline-[3px] focus-visible:after:outline-offset-2 focus-visible:after:outline-indigo"
        >
          {name}
        </Link>
      </Heading>

      {location ? (
        <p className="flex items-center gap-1.5 text-[15px] font-semibold text-muted">
          <PinIcon className="shrink-0" />
          <span className="min-w-0">{location}</span>
        </p>
      ) : null}

      {shown.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Specialisms">
          {shown.map((tag) => (
            <li
              key={tag}
              className="max-w-full truncate rounded-full bg-lavender px-3 py-1.5 text-[13px] font-semibold text-navy"
            >
              {tag}
            </li>
          ))}
          {extra > 0 ? (
            <li className="rounded-full border border-line-strong px-3 py-[5px] text-[13px] font-semibold text-muted">
              +{extra} more
            </li>
          ) : null}
        </ul>
      ) : null}

      <p
        aria-hidden="true"
        className="mt-auto flex items-center gap-1.5 pt-2.5 text-base font-bold text-indigo group-hover:text-indigo-deep"
      >
        View profile
        <ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-1" />
      </p>
    </article>
  );
}

export type AgencyGridProps = {
  children: React.ReactNode;
  /** Narrowest a card may get before the grid drops a column. */
  minCardWidth?: 250 | 270;
  className?: string;
};

/** Even grid for agency cards: 1 column on phones, up to 4 on desktop. */
export function AgencyGrid({ children, minCardWidth = 250, className }: AgencyGridProps) {
  return (
    <div
      className={cx(
        "grid gap-4 sm:gap-[22px]",
        minCardWidth === 250
          ? "grid-cols-[repeat(auto-fill,minmax(min(250px,100%),1fr))]"
          : "grid-cols-[repeat(auto-fill,minmax(min(270px,100%),1fr))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
