import Link from "next/link";
import { cx } from "./cx";

export type CompactLink = { label: string; href: string; count?: number };

export type CompactLinksProps = {
  links: CompactLink[];
  /** What the count is of, for screen readers. */
  countNoun?: [singular: string, plural: string];
  className?: string;
};

/**
 * A dense, multi-column list of text links with optional counts. For long
 * lists (every town in a country) where pills would run for pages.
 */
export function CompactLinks({
  links,
  countNoun = ["agency", "agencies"],
  className,
}: CompactLinksProps) {
  if (links.length === 0) return null;
  return (
    <ul
      className={cx(
        "grid grid-cols-2 gap-x-5 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-x-8",
        className,
      )}
    >
      {links.map((link) => (
        <li key={link.href} className="min-w-0 border-b border-line">
          <Link
            href={link.href}
            className="flex min-h-11 items-center justify-between gap-3 py-2 text-base font-semibold text-navy hover:text-indigo-deep"
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{link.label}</span>
            {link.count !== undefined ? (
              <span className="shrink-0 font-mono text-[13px] font-bold text-muted">
                <span className="sr-only">(</span>
                {link.count.toLocaleString("en")}
                <span className="sr-only">
                  {" "}
                  {link.count === 1 ? countNoun[0] : countNoun[1]})
                </span>
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
