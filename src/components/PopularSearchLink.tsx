import Link from "next/link";
import { cx } from "./cx";
import { ArrowRightIcon } from "./icons";

export type PopularSearchLinkProps = {
  label: string;
  href: string;
  /** Shows a number on the right instead of the arrow (city page lists). */
  count?: number;
  /** "light" on white backgrounds, "panel" on a lavender panel. */
  tone?: "light" | "panel";
  className?: string;
};

/** A row in a list of search links, with an arrow or a count on the right. */
export function PopularSearchLink({
  label,
  href,
  count,
  tone = "light",
  className,
}: PopularSearchLinkProps) {
  return (
    <Link
      href={href}
      className={cx(
        "group flex min-h-[52px] min-w-0 items-center justify-between gap-3 border-b py-3 text-[17px] font-semibold text-navy transition-colors hover:text-indigo-deep",
        tone === "light" ? "border-line-mid" : "border-line-strong",
        className,
      )}
    >
      <span className="min-w-0">{label}</span>
      {count !== undefined ? (
        <span className="shrink-0 font-mono text-sm font-bold text-muted">
          <span className="sr-only">(</span>
          {count.toLocaleString("en")}
          <span className="sr-only"> agencies)</span>
        </span>
      ) : (
        <ArrowRightIcon className="shrink-0 text-indigo transition-transform duration-200 group-hover:translate-x-1" />
      )}
    </Link>
  );
}

export type LinkListProps = { children: React.ReactNode; className?: string };

/** Lays PopularSearchLink rows out in one, two or three even columns. */
export function LinkList({ children, className }: LinkListProps) {
  return (
    <div
      className={cx(
        "grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-x-12",
        className,
      )}
    >
      {children}
    </div>
  );
}
