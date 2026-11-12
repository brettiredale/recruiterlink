import Link from "next/link";
import { cx } from "./cx";

export type SpecialismChipProps = {
  name: string;
  href: string;
  /** Number of agencies, shown after the name. */
  count?: number;
  /**
   * "chip" is the soft rounded rectangle on the home page.
   * "filter" is the pill used in the city page's specialism filter.
   */
  variant?: "chip" | "filter";
  /** Marks the filter that is currently applied. */
  active?: boolean;
  className?: string;
};

/** Link to a specialism, or one option in a specialism filter. */
export function SpecialismChip({
  name,
  href,
  count,
  variant = "chip",
  active = false,
  className,
}: SpecialismChipProps) {
  const filter = variant === "filter";
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cx(
        "inline-flex min-h-11 max-w-full items-center gap-2.5 text-base leading-tight transition-colors",
        filter
          ? "rounded-full border-[1.5px] px-[18px] py-2.5"
          : "rounded-chip border px-[18px] py-3.5",
        active
          ? "border-navy bg-navy font-bold text-white"
          : filter
            ? "border-line-strong bg-white font-semibold text-navy hover:border-navy"
            : "border-line-mid bg-pale font-semibold text-navy hover:border-indigo hover:bg-lavender",
        className,
      )}
    >
      <span className="min-w-0">{name}</span>
      {count !== undefined ? (
        <span
          className={cx(
            "font-mono text-[13px] font-bold",
            active ? "text-pink-soft" : "text-indigo",
          )}
        >
          <span className="sr-only">(</span>
          {count.toLocaleString("en")}
          <span className="sr-only"> agencies)</span>
        </span>
      ) : null}
    </Link>
  );
}
