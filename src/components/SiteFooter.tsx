import Link from "next/link";
import { Container } from "./Container";
import type { NavItem } from "./MobileMenu";
import { Wordmark } from "./Wordmark";

export type FooterColumn = { title: string; links: NavItem[] };

export const defaultFooterColumns: FooterColumn[] = [
  {
    title: "Directory",
    links: [
      { label: "Find agencies", href: "/search" },
      { label: "Countries", href: "/countries" },
      { label: "Specialisms", href: "/specialisms" },
    ],
  },
  {
    title: "For agencies",
    links: [
      { label: "List your agency", href: "/for-agencies" },
      { label: "Premium", href: "/for-agencies#pricing" },
      { label: "Claim your listing", href: "/account/sign-in" },
      { label: "Agency sign in", href: "/account" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Legal", href: "/legal" },
    ],
  },
];

export type SiteFooterProps = {
  columns?: FooterColumn[];
  /** Line under the wordmark. */
  tagline?: string;
  /**
   * Year for the copyright line. Passed in by the page (rather than read from
   * the clock here) so the footer can be part of a cached, pre-built page.
   */
  year?: number;
};

/** Navy site footer with link columns. */
export function SiteFooter({
  columns = defaultFooterColumns,
  tagline = "The global directory of recruitment agencies.",
  year,
}: SiteFooterProps) {
  return (
    <footer className="on-dark bg-navy pt-14 pb-10 text-on-navy sm:pt-16">
      <Container>
        <div className="flex flex-wrap gap-x-20 gap-y-10">
          <div className="flex-[1_1_280px]">
            <p className="mb-3">
              <Wordmark tone="dark" />
            </p>
            <p className="max-w-80 text-base">{tagline}</p>
          </div>
          {columns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="min-w-[130px] flex-[1_1_130px] sm:flex-none"
            >
              <h2 className="label-mono mb-2 text-[13px] font-normal text-pink-soft">
                {column.title}
              </h2>
              <ul className="text-base">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="flex min-h-11 items-center text-white underline-offset-4 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-12 text-sm text-on-navy-muted">
          © {year ? `${year} ` : ""}RecruiterLink
        </p>
      </Container>
    </footer>
  );
}
