import Link from "next/link";
import { cx } from "./cx";

export type CountryTileProps = {
  name: string;
  /** Number of agencies in the country. */
  count: number;
  href: string;
  className?: string;
};

/** White tile linking to a country, for use on a lavender panel. */
export function CountryTile({ name, count, href, className }: CountryTileProps) {
  return (
    <Link
      href={href}
      className={cx(
        "group flex min-w-0 flex-col gap-0.5 rounded-tile border-[1.5px] border-transparent bg-white px-[22px] py-5 text-navy transition hover:border-indigo hover:shadow-card",
        className,
      )}
    >
      <span className="font-heading text-[21px] leading-tight font-bold tracking-[-0.02em] group-hover:text-indigo-deep">
        {name}
      </span>
      <span className="text-[15px] text-muted">
        {count.toLocaleString("en")} {count === 1 ? "agency" : "agencies"}
      </span>
    </Link>
  );
}
