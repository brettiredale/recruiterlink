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
  /** The quiet "Sign in" link for agencies that already manage a listing. */
  signIn?: NavItem;
  /** Where the logo links to. */
  homeHref?: string;
};

/**
 * Site header: wordmark, main navigation, "Sign in" for agencies and
 * "List your agency". The header is the same for every visitor (it is part
 * of pages that are built once), so it never shows who is signed in.
 */
export function SiteHeader({
  navItems = defaultNavItems,
  listAgency = { label: "List your agency", href: "/for-agencies" },
  signIn = { label: "Sign in", href: "/account" },
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

        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href={signIn.href}
            prefetch={false}
            className="hidden min-h-11 items-center text-base font-semibold whitespace-nowrap text-navy transition-colors hover:text-indigo sm:flex"
          >
            {signIn.label}
          </Link>
          <div className="hidden sm:block">
            <ButtonLink
              href={listAgency.href}
              variant="primary-small"
              className="whitespace-nowrap"
            >
              {listAgency.label}
            </ButtonLink>
          </div>
          <MobileMenu items={navItems} listAgency={listAgency} signIn={signIn} />
        </div>
      </Container>
    </header>
  );
}
