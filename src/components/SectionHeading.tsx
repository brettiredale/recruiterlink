import Link from "next/link";
import { cx } from "./cx";

export type SectionHeadingProps = {
  title: string;
  /** One line of supporting text under the title. */
  description?: string;
  /** Optional link on the right, e.g. "View all 209 agencies". */
  action?: { label: string; href: string };
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** "lg" for the lead section of a page, "md" for the rest, "sm" on city pages. */
  size?: "lg" | "md" | "sm";
  as?: "h1" | "h2" | "h3";
  /** id for the heading, so a section can point at it with aria-labelledby. */
  id?: string;
  className?: string;
};

const sizes = {
  lg: "text-[clamp(1.875rem,3.2vw,2.625rem)] leading-[1.1]",
  md: "text-[clamp(1.75rem,3vw,2.375rem)] leading-[1.15]",
  sm: "text-[clamp(1.625rem,2.8vw,2.125rem)] leading-[1.15]",
};

/** Section title with optional description and a "view all" link. */
export function SectionHeading({
  title,
  description,
  action,
  eyebrow,
  size = "md",
  as: Heading = "h2",
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cx(
        "mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 sm:mb-[26px]",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="label-mono mb-2 text-[13px] text-pink-text">{eyebrow}</p>
        ) : null}
        <Heading
          id={id}
          className={cx(
            "font-heading font-extrabold tracking-[-0.03em] text-balance",
            sizes[size],
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-2 max-w-[720px] text-lg text-muted">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="flex min-h-11 items-center text-[17px] font-bold text-indigo underline-offset-4 hover:text-indigo-deep hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
