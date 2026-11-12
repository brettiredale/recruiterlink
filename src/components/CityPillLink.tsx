import Link from "next/link";
import { cx } from "./cx";

export type CityPillLinkProps = {
  name: string;
  /** Number of agencies in the city. */
  count: number;
  href: string;
  className?: string;
};

/** Outlined pill linking to a city page, with its agency count in pink. */
export function CityPillLink({ name, count, href, className }: CityPillLinkProps) {
  return (
    <Link
      href={href}
      className={cx(
        "group flex min-w-0 items-center justify-between gap-3 min-h-[60px] rounded-[34px] border-[1.5px] border-navy py-2.5 pr-4 pl-[26px] text-navy transition-colors hover:bg-navy hover:text-white",
        className,
      )}
    >
      <span className="min-w-0 font-heading text-xl leading-[1.15] font-bold [overflow-wrap:anywhere] tracking-[-0.02em]">
        {name}
      </span>
      <span className="min-w-10 shrink-0 rounded-full bg-pink px-2.5 py-2 text-center font-mono text-sm leading-[1.4] font-bold text-navy">
        <span className="sr-only">, </span>
        {count.toLocaleString("en")}
        <span className="sr-only"> {count === 1 ? "agency" : "agencies"}</span>
      </span>
    </Link>
  );
}

export type PillGridProps = { children: React.ReactNode; className?: string };

/** Even grid for city pills and country tiles. */
export function PillGrid({ children, className }: PillGridProps) {
  return (
    <div
      className={cx(
        "grid grid-cols-[repeat(auto-fill,minmax(min(250px,100%),1fr))] gap-3 sm:gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
