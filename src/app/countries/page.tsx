import type { Metadata } from "next";
import Link from "next/link";
import {
  Breadcrumbs,
  CompactLinks,
  Container,
  CountryTile,
  JsonLd,
  PageIntro,
  PillGrid,
  PricingBanner,
  SectionHeading,
} from "@/components";
import { getCountries, getCountryCities, getTotals } from "@/lib/directory";
import { cityPath, countriesPath, countryPath, forAgenciesPath } from "@/lib/routes";
import { linkListJsonLd, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { agencyCountLabel } from "@/lib/text";

export const ensureStatic = "navigation";

/** Largest cities listed under each country. */
const CITIES_PER_COUNTRY = 8;

export async function generateMetadata(): Promise<Metadata> {
  const totals = await getTotals();
  return pageMetadata({
    title: "Recruitment agencies by country",
    description: `Browse ${agencyCountLabel(totals.agencyCount).replace("agenc", "recruitment agenc")} in ${totals.countryCount} countries and ${totals.cityCount.toLocaleString("en")} towns and cities. Choose a country to see its cities and agencies.`,
    path: countriesPath,
  });
}

export default async function CountriesPage() {
  const [totals, allCountries] = await Promise.all([getTotals(), getCountries()]);
  const countries = allCountries.filter((country) => country.agencyCount > 0);
  const citiesByCountry = await Promise.all(
    countries.map((country) => getCountryCities(country.slug)),
  );

  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "Countries", href: countriesPath },
          ]}
        />
      </Container>

      <PageIntro
        eyebrow={`${agencyCountLabel(totals.agencyCount)} · ${totals.countryCount} countries`}
        title="Recruitment agencies by country"
        intro="Choose a country to see every city we cover there and all of its recruitment agencies."
      />

      <section aria-labelledby="all-countries-heading" className="py-10 sm:py-12">
        <Container>
          <div className="rounded-panel bg-lavender px-5 py-10 sm:px-10 lg:px-14">
            <SectionHeading
              id="all-countries-heading"
              title={`All ${countries.length} countries`}
              description="Largest first."
              size="sm"
            />
            <PillGrid>
              {countries.map((country) => (
                <CountryTile
                  key={country.id}
                  name={country.name}
                  count={country.agencyCount}
                  href={countryPath(country.slug)}
                />
              ))}
            </PillGrid>
          </div>
          <JsonLd
            data={linkListJsonLd(
              "Recruitment agencies by country",
              countriesPath,
              countries.map((country) => ({
                name: `Recruitment agencies in ${country.name}`,
                path: countryPath(country.slug),
              })),
            )}
          />
        </Container>
      </section>

      <section aria-labelledby="cities-heading" className="pb-10 sm:pb-14">
        <Container>
          <SectionHeading
            id="cities-heading"
            title="Largest cities in each country"
            description="Each country's page lists all of its towns and cities."
            size="sm"
          />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-x-12 gap-y-9">
            {countries.map((country, index) => {
              const cities = citiesByCountry[index];
              if (cities.length === 0) return null;
              return (
                <div key={country.id} className="min-w-0">
                  <h3 className="mb-1 font-heading text-[22px] leading-tight font-bold tracking-[-0.02em]">
                    <Link
                      href={countryPath(country.slug)}
                      className="hover:text-indigo-deep hover:underline"
                    >
                      {country.name}
                    </Link>
                  </h3>
                  <CompactLinks
                    className="!grid-cols-1"
                    links={cities.slice(0, CITIES_PER_COUNTRY).map((city) => ({
                      label: city.name,
                      href: cityPath(country.slug, city.slug),
                      count: city.agencyCount,
                    }))}
                  />
                  {cities.length > CITIES_PER_COUNTRY ? (
                    <Link
                      href={`${countryPath(country.slug)}#cities`}
                      className="mt-1 inline-flex min-h-11 items-center text-base font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
                    >
                      All {cities.length.toLocaleString("en")} towns and cities in{" "}
                      {country.name}
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="pb-16 sm:pb-[88px]">
        <Container>
          <PricingBanner variant="compact" freeHref={forAgenciesPath} />
        </Container>
      </section>
    </>
  );
}
