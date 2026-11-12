import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, ButtonLink, Container, PageIntro } from "@/components";
import { getTotals } from "@/lib/directory";
import { countriesPath, forAgenciesPath, searchPath, specialismsPath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const ensureStatic = "navigation";

export const metadata: Metadata = pageMetadata({
  title: "About RecruiterLink",
  description:
    "RecruiterLink is a global directory of recruitment agencies. Employers and job seekers use it to find agencies by country, city and specialism.",
  path: "/about",
});

const linkClass = "font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep";

export default async function AboutPage() {
  const totals = await getTotals();

  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "About", href: "/about" },
          ]}
        />
      </Container>
      <PageIntro
        title="About RecruiterLink"
        intro="RecruiterLink is a global directory of recruitment agencies."
      />
      <Container width="narrow" className="flex flex-col gap-9 py-10 sm:py-14">
        <section aria-labelledby="what-heading" className="flex flex-col gap-4 text-[17px] text-muted">
          <h2
            id="what-heading"
            className="font-heading text-[clamp(1.625rem,2.8vw,2.125rem)] leading-[1.15] font-extrabold tracking-[-0.03em] text-navy"
          >
            What RecruiterLink is
          </h2>
          <p>
            The directory lists {totals.agencyCount.toLocaleString("en")} recruitment
            agencies in {totals.countryCount} countries and{" "}
            {totals.cityCount.toLocaleString("en")} towns and cities, across{" "}
            {totals.specialismCount} specialisms. Each agency has its own page with a
            description, its location, the sectors it recruits for and a link to its
            website.
          </p>
          <p>
            It is for two kinds of visitor. If you are hiring, it helps you find
            agencies that recruit for the roles you need, in the place you need them. If
            you are looking for work, it helps you find the recruiters who place people
            in your field.
          </p>
        </section>

        <section aria-labelledby="how-heading" className="flex flex-col gap-4 text-[17px] text-muted">
          <h2
            id="how-heading"
            className="font-heading text-[clamp(1.625rem,2.8vw,2.125rem)] leading-[1.15] font-extrabold tracking-[-0.03em] text-navy"
          >
            How to use it
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            <li>
              <Link href={searchPath} className={linkClass}>
                Search
              </Link>{" "}
              by describing what you need and where, such as “IT recruiters in Madrid”.
            </li>
            <li>
              <Link href={countriesPath} className={linkClass}>
                Browse by country
              </Link>
              , then by city. Every city has a page listing all of its agencies, with a
              filter by specialism.
            </li>
            <li>
              <Link href={specialismsPath} className={linkClass}>
                Browse by specialism
              </Link>{" "}
              to see where the agencies for one sector are.
            </li>
          </ul>
          <p>
            RecruiterLink does not recruit and does not pass messages on to agencies. To
            contact an agency, follow the website link on its page.
          </p>
        </section>

        <section aria-labelledby="agencies-heading" className="flex flex-col gap-4 text-[17px] text-muted">
          <h2
            id="agencies-heading"
            className="font-heading text-[clamp(1.625rem,2.8vw,2.125rem)] leading-[1.15] font-extrabold tracking-[-0.03em] text-navy"
          >
            For recruitment agencies
          </h2>
          <p>
            A listing is free. A Premium listing adds images, video, team and leadership
            profiles and customer testimonials for $49 USD a month or $490 USD a year.
          </p>
          <p>
            <ButtonLink href={forAgenciesPath} variant="navy">
              List your agency
            </ButtonLink>
          </p>
        </section>
      </Container>
    </>
  );
}
