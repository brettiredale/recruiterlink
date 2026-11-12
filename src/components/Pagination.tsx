import Link from "next/link";
import { cx } from "./cx";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

export type PaginationProps = {
  /** Page being shown, starting at 1. */
  currentPage: number;
  totalPages: number;
  /**
   * Address of page 1, e.g. "/spain/madrid". Later pages add `?page=N`
   * (or `&page=N` when the address already has a query).
   */
  basePath: string;
  /** Name of the page number in the address. */
  pageParam?: string;
  /** Optional line above the links, e.g. "Showing 13 to 24 of 73 agencies". */
  summary?: string;
  /** What is being paged, for screen readers, e.g. "Agencies in Madrid". */
  label?: string;
  className?: string;
};

/** Address for a page number. Page 1 is always the bare address. */
export function pageHref(basePath: string, page: number, pageParam = "page") {
  if (page <= 1) return basePath;
  return `${basePath}${basePath.includes("?") ? "&" : "?"}${pageParam}=${page}`;
}

/** Page numbers to show: first, last, and those around the current page. */
export function pageWindow(current: number, total: number): Array<number | "gap"> {
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((n) => wanted.add(n));
  const pages = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const out: Array<number | "gap"> = [];
  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && page - previous === 2) out.push(previous + 1);
    else if (previous !== undefined && page - previous > 2) out.push("gap");
    out.push(page);
  });
  return out;
}

const stepClass =
  "inline-flex min-h-12 items-center gap-2 rounded-btn px-5 text-[17px] font-bold transition-colors";

/**
 * Page links for long lists. Every page is a real link with its own address,
 * and the previous and next links carry rel="prev" and rel="next".
 */
export function Pagination({
  currentPage,
  totalPages,
  basePath,
  pageParam = "page",
  summary,
  label = "Pages",
  className,
}: PaginationProps) {
  if (totalPages <= 1) {
    return summary ? (
      <p className={cx("text-center text-base text-muted", className)}>{summary}</p>
    ) : null;
  }

  const current = Math.min(Math.max(1, currentPage), totalPages);
  const href = (page: number) => pageHref(basePath, page, pageParam);

  return (
    <nav aria-label={label} className={cx("flex flex-col items-center gap-4", className)}>
      {summary ? <p className="text-base text-muted">{summary}</p> : null}

      <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-3">
        {current > 1 ? (
          <Link
            href={href(current - 1)}
            rel="prev"
            className={cx(stepClass, "border-[1.5px] border-navy pl-3.5 text-navy hover:bg-lavender")}
          >
            <ChevronLeftIcon size={18} />
            Previous<span className="sr-only"> page</span>
          </Link>
        ) : null}

        <ol className="hidden items-center gap-1.5 sm:flex">
          {pageWindow(current, totalPages).map((page, index) =>
            page === "gap" ? (
              <li key={`gap-${index}`} aria-hidden="true" className="px-1 font-bold text-muted">
                …
              </li>
            ) : (
              <li key={page}>
                <Link
                  href={href(page)}
                  aria-label={`Page ${page}`}
                  aria-current={page === current ? "page" : undefined}
                  className={cx(
                    "flex size-12 items-center justify-center rounded-btn font-mono text-base font-bold transition-colors",
                    page === current
                      ? "bg-lavender text-navy ring-[1.5px] ring-navy ring-inset"
                      : "text-navy hover:bg-lavender",
                  )}
                >
                  {page}
                </Link>
              </li>
            ),
          )}
        </ol>

        <p className="order-first w-full text-center font-mono text-[15px] font-bold text-navy sm:hidden">
          Page {current} of {totalPages}
        </p>

        {current < totalPages ? (
          <Link
            href={href(current + 1)}
            rel="next"
            className={cx(stepClass, "bg-navy pr-3.5 text-white hover:bg-[#33267a]")}
          >
            Next<span className="sr-only"> page</span>
            <ChevronRightIcon size={18} />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
