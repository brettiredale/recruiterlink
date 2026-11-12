import Link from "next/link";
import { ButtonLink } from "./ButtonLink";
import { Container } from "./Container";
import { MobileMenu, type NavItem } from "./MobileMenu";
import { Wordmark } from "./Wordmark";

export type { NavItem };

export const defaultNavItems: NavItem[] = [
  { label: "Find agencies", href: "/search" },
  { label: "Countries", href: "/countries" },
  { label: "Specialisms", href: "/specialisms" },
  { label: "For agencies", href: "/for-agencies" },
];

export type SiteHeaderProps = {
  /** Main navigation links. */
  navItems?: NavItem[];
  /** The pink "List your agency" button. */
  listAgency?: NavItem;
  /** Where the logo links to. */
  homeHref?: string;
};

/**
 * Site header: wordmark, main navigation and "List your agency". There is
 * no "Log in" until agency logins exist.
 */
export function SiteHeader({
  navItems = defaultNavItems,
  listAgency = { label: "List your agency", href: "/for-agencies" },
  homeHref = "/",
}: SiteHeaderProps) {
  return (
    <header className="relative z-30 bg-white py-3.5 min-[1120px]:py-5">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-btn-sm focus:bg-navy focus:px-4 focus:py-3 focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>
      <Container className="flex items-center justify-between gap-x-9 gap-y-4">
        <Link
          href={homeHref}
          aria-label="RecruiterLink home"
          className="flex min-h-11 items-center"
        >
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 min-[1120px]:block">
          <ul className="flex items-center gap-x-7 text-base font-semibold">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center whitespace-nowrap text-navy transition-colors hover:text-indigo"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ButtonLink
              href={listAgency.href}
              variant="primary-small"
              className="whitespace-nowrap"
            >
              {listAgency.label}
            </ButtonLink>
          </div>
          <MobileMenu items={navItems} listAgency={listAgency} />
        </div>
      </Container>
    </header>
  );
}
