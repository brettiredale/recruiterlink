import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import {
  Container,
  CountryTile,
  FaqList,
  JsonLd,
  PillGrid,
  PricingBanner,
  SearchBox,
  SectionHeading,
} from "@/components";
import { HomeDirectory, homeCountrySlugFor } from "@/features/home-directory";
import { getCountries, getTotals } from "@/lib/directory";
import { homeFaqs } from "@/lib/faq";
import { countriesPath, countryPath, searchResultsPath } from "@/lib/routes";
import { pageMetadata, siteJsonLd } from "@/lib/seo";
import { siteName } from "@/lib/site";

/** Example searches under the search box. The same for every visitor. */
const EXAMPLE_SEARCHES = [
  "IT recruiters in London",
  "Executive search in New York",
  "Legal recruiters in Sydney",
  "Engineering recruiters in Toronto",
];

const COUNTRY_TILES = 8;

export async function generateMetadata(): Promise<Metadata> {
  const totals = await getTotals();
  return pageMetadata({
    title: `${siteName}: find a recruitment agency by city, country and specialism`,
    absoluteTitle: true,
    description: `Search ${totals.agencyCount.toLocaleString("en")} recruitment agencies in ${totals.countryCount} countries. Find the right agency for your next hire or job search, by city and by specialism.`,
    path: "/",
  });
}

/**
 * Picks the visitor's version of the directory section. This is the only
 * part of the page that looks at the request: Vercel's `x-vercel-ip-country`
 * header says which country the visitor is in. Nobody is ever redirected.
 *
 * Search engine and AI crawlers always get the worldwide version (they
 * mostly visit from the United States and should not be shown one country's
 * agencies as if that were the whole site), as do visitors with no country
 * or one we have too few agencies in.
 */
async function VisitorDirectory() {
  const requestHeaders = await headers();
  const isBot = /bot|crawl|spider|slurp|facebookexternalhit|preview|fetch|GPT|Claude|Perplexity|Google-Extended|bingpreview/i.test(
    requestHeaders.get("user-agent") ?? "",
  );
  const countrySlug = isBot
    ? null
    : await homeCountrySlugFor(requestHeaders.get("x-vercel-ip-country"));
  return <HomeDirectory countrySlug={countrySlug} />;
}

export default async function HomePage() {
  const [totals, countries] = await Promise.all([getTotals(), getCountries()]);

  return (
    <>
      <section className="bg-[linear-gradient(to_bottom,rgba(76,87,230,0.24),rgba(76,87,230,0.03))] pt-12 pb-9 text-center sm:pt-[72px] sm:pb-12">
        <Container className="flex !max-w-[1148px] flex-col items-center gap-6">
          <h1 className="font-heading text-[clamp(2.125rem,4.6vw,4rem)] leading-[1.06] font-extrabold tracking-[-0.035em] text-balance">
            Find the perfect recruitment agency for your next hire or job search
          </h1>
          <p className="max-w-[660px] text-lg text-muted sm:text-[21px]">
            Describe what you need and where. We will show you the agencies that fit.
          </p>
          <SearchBox className="mt-1.5" />
          <ul aria-label="Example searches" className="flex flex-wrap justify-center gap-2.5">
            {EXAMPLE_SEARCHES.map((example) => (
              <li key={example}>
                <Link
                  href={searchResultsPath(example)}
                  className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-white px-4 py-2 text-[15px] font-semibold text-navy hover:border-navy"
                >
                  {example}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* The worldwide version is in the page from the start; a visitor in a
          country we cover has it swapped for their country's as it arrives. */}
      <Suspense fallback={<HomeDirectory countrySlug={null} />}>
        <VisitorDirectory />
      </Suspense>

      <section id="countries" aria-labelledby="countries-heading" className="pt-14 pb-10">
        <Container>
          <div className="rounded-panel bg-lavender px-5 pt-12 pb-[52px] sm:px-10 lg:px-14">
            <SectionHeading
              id="countries-heading"
              title="Recruitment agencies around the world"
              description={`${totals.agencyCount.toLocaleString("en")} agencies in ${totals.countryCount} countries. Choose a country to browse its cities.`}
              className="!mb-7"
            />
            <PillGrid>
              {countries.slice(0, COUNTRY_TILES).map((country) => (
                <CountryTile
                  key={country.id}
                  name={country.name}
                  count={country.agencyCount}
                  href={countryPath(country.slug)}
                />
              ))}
            </PillGrid>
            <p className="mt-[22px]">
              <Link
                href={countriesPath}
                className="inline-flex min-h-11 items-center text-[17px] font-bold text-indigo-deep underline underline-offset-4 hover:text-navy"
              >
                All {countries.length} countries
              </Link>
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="faq-heading" className="pt-10 pb-[72px]">
        <Container width="narrow">
          <SectionHeading id="faq-heading" title="Questions and answers" className="!mb-[18px]" />
          <FaqList items={homeFaqs(totals)} />
        </Container>
      </section>

      <section id="pricing" className="pb-16 sm:pb-[88px]">
        <Container>
          <PricingBanner />
        </Container>
      </section>

      <JsonLd data={siteJsonLd()} />
    </>
  );
}
