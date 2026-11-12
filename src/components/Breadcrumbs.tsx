import Link from "next/link";
import { cx } from "./cx";
import { ChevronRightIcon } from "./icons";
import { JsonLd } from "./JsonLd";

export type Crumb = {
  label: string;
  /** Path such as "/spain". The last crumb (the current page) may omit it. */
  href?: string;
};

export type BreadcrumbsProps = {
  /** From the home page down to the current page, in order. */
  items: Crumb[];
  /**
   * Site address, e.g. "https://www.recruiterlink.com". When given, the
   * structured data uses full addresses, which search engines prefer.
   */
  baseUrl?: string;
  /** Set false to leave out the structured data. */
  jsonLd?: boolean;
  className?: string;
};

/** Builds the schema.org BreadcrumbList for a trail of crumbs. */
export function breadcrumbJsonLd(items: Crumb[], baseUrl?: string) {
  const root = baseUrl?.replace(/\/+$/, "") ?? "";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: root + item.href } : {}),
    })),
  };
}

/** Breadcrumb trail with schema.org BreadcrumbList structured data. */
export function Breadcrumbs({ items, baseUrl, jsonLd = true, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  const last = items.length - 1;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 text-[15px] text-muted">
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`} className="flex items-center gap-2">
            {index > 0 ? <ChevronRightIcon size={14} className="shrink-0" /> : null}
            {index === last || !item.href ? (
              <span
                aria-current={index === last ? "page" : undefined}
                className={cx("flex min-h-11 items-center", index === last && "font-bold text-navy")}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="flex min-h-11 items-center underline underline-offset-2 hover:text-indigo-deep"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      {jsonLd ? <JsonLd data={breadcrumbJsonLd(items, baseUrl)} /> : null}
    </nav>
  );
}
