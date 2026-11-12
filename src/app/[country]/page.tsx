import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AgencyList,
  Breadcrumbs,
  CityPillLink,
  CompactLinks,
  Container,
  FaqList,
  JsonLd,
  PillGrid,
  PricingBanner,
  SearchBox,
  SectionHeading,
  SpecialismChip,
} from "@/components";
import {
  getCountries,
  getCountry,
  getCountryCities,
  getCountrySpecialisms,
  getFeaturedAgencies,
} from "@/lib/directory";
import { countryFaqs } from "@/lib/faq";
import {
  cityPath,
  countriesPath,
  countryPath,
  forAgenciesPath,
  isReservedTopLevelSlug,
  isValidSlug,
  specialismPath,
} from "@/lib/routes";
import { agencyListJsonLd, notFoundMetadata, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { genericLast } from "@/lib/specialisms";
import { agencyCountLabel } from "@/lib/text";

// The whole page is built once and stored; an address that has not been
// built yet waits for the complete page rather than getting a part-filled one.
export const ensureStatic = "navigation";

/** Largest cities shown as pills; the rest go in the full A to Z list. */
const TOP_CITIES = 24;
const FEATURED = 12;

export async function generateStaticParams() {
  const countries = await getCountries();
  return countries.map((country) => ({ country: country.slug }));
}

async function loadCountry(slug: string) {
  // Fixed pages own these words; anything not shaped like a slug is not ours.
  if (!isValidSlug(slug) || isReservedTopLevelSlug(slug)) return null;
  const country = await getCountry(slug);
  return country && country.agencyCount > 0 ? country : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[country]">): Promise<Metadata> {
  const { country: slug } = await params;
  const country = await loadCountry(slug);
  if (!country) return notFoundMetadata;
  return pageMetadata({
    title: `Recruitment agencies in ${country.name}`,
    description:
      country.cityCount > 1
        ? `Browse ${agencyCountLabel(country.agencyCount).replace("agenc", "recruitment agenc")} in ${country.name}, across ${country.cityCount.toLocaleString("en")} towns and cities. Find agencies by city and by specialism.`
        : `Browse ${agencyCountLabel(country.agencyCount).replace("agenc", "recruitment agenc")} in ${country.name}. Find agencies by city and by specialism.`,
    path: countryPath(country.slug),
  });
}

export default async function CountryPage({ params }: PageProps<"/[country]">) {
  const { country: slug } = await params;
  const country = await loadCountry(slug);
  if (!country) notFound();

  const [cities, specialisms, featured] = await Promise.all([
    getCountryCities(country.slug),
    getCountrySpecialisms(country.id, country.slug),
    getFeaturedAgencies({ id: country.id, slug: country.slug }, FEATURED),
  ]);

  const topCities = cities.slice(0, TOP_CITIES);
  const allCitiesByName = [...cities].sort((a, b) => a.name.localeCompare(b.name, "en"));
  const orderedSpecialisms = genericLast(specialisms);
  const path = countryPath(country.slug);
  const faqs = countryFaqs({
    country: country.name,
    agencyCount: country.agencyCount,
    cityCount: country.cityCount,
    cities,
    specialisms,
  });

  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "Countries", href: countriesPath },
            { label: country.name, href: path },
          ]}
        />
      </Container>

      <section className="bg-[linear-gradient(to_bottom,rgba(76,87,230,0.18),rgba(76,87,230,0.02))] py-10 sm:py-14">
        <Container className="flex flex-col gap-5">
          <p className="label-mono text-[13px] text-pink-text sm:text-sm">
            {agencyCountLabel(country.agencyCount)}
            {country.cityCount > 1
              ? ` · ${country.cityCount.toLocaleString("en")} towns and cities`
              : ""}
          </p>
          <h1 className="font-heading text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">
            Recruitment agencies in {country.name}
          </h1>
          <p className="max-w-[680px] text-lg text-muted sm:text-xl">
            Every recruitment agency we list in {country.name}, by city and by
            specialism, whether you are hiring or looking for your next job.
          </p>
          <SearchBox
            variant="compact"
            placeholder={`IT recruiters in ${cities[0]?.name ?? country.name}`}
            label={`Describe the agency you are looking for in ${country.name}`}
            formLabel={`Search agencies in ${country.name}`}
            hiddenFields={{ country: country.slug }}
            className="mt-1"
          />
        </Container>
      </section>

      {featured.length > 0 ? (
        <section aria-labelledby="featured-heading" className="py-10 sm:py-12">
          <Container>
            <SectionHeading
              id="featured-heading"
              title={`Featured recruitment agencies in ${country.name}`}
              size="sm"
            />
            <AgencyList agencies={featured} />
            <JsonLd
              data={agencyListJsonLd(
                `Featured recruitment agencies in ${country.name}`,
                featured,
                { path },
              )}
            />
          </Container>
        </section>
      ) : null}

      <section id="cities" aria-labelledby="cities-heading" className="py-10 sm:py-12">
        <Container>
          <SectionHeading
            id="cities-heading"
            title={`Recruitment agencies in ${country.name} by city`}
            description="Every city has its own page listing all of its agencies."
            size="sm"
          />
          <PillGrid>
            {topCities.map((city) => (
              <CityPillLink
                key={city.id}
                name={city.name}
                count={city.agencyCount}
                href={cityPath(country.slug, city.slug)}
              />
            ))}
          </PillGrid>

          {cities.length > topCities.length ? (
            <div className="mt-10">
              <h3 className="mb-3 font-heading text-[22px] leading-tight font-bold tracking-[-0.02em]">
                All {cities.length.toLocaleString("en")} towns and cities in{" "}
                {country.name}, A to Z
              </h3>
              <CompactLinks
                links={allCitiesByName.map((city) => ({
                  label: city.name,
                  href: cityPath(country.slug, city.slug),
                  count: city.agencyCount,
                }))}
              />
            </div>
          ) : null}
        </Container>
      </section>

      {orderedSpecialisms.length > 0 ? (
        <section
          id="specialisms"
          aria-labelledby="specialisms-heading"
          className="py-10 sm:py-12"
        >
          <Container>
            <SectionHeading
              id="specialisms-heading"
              title={`Recruitment agencies in ${country.name} by specialism`}
              description={`How many agencies in ${country.name} list each specialism. Choose one to see where its agencies are.`}
              size="sm"
            />
            <ul className="flex flex-wrap gap-3">
              {orderedSpecialisms.map((specialism) => (
                <li key={specialism.id} className="max-w-full">
                  <SpecialismChip
                    name={specialism.name}
                    count={specialism.agencyCount}
                    href={specialismPath(specialism.slug)}
                  />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="faq-heading" className="py-10 sm:py-14">
        <Container width="narrow">
          <SectionHeading
            id="faq-heading"
            title={`Recruitment agencies in ${country.name}: questions and answers`}
            size="sm"
            className="!mb-[18px]"
          />
          <FaqList items={faqs} />
        </Container>
      </section>

      <section className="pb-16 sm:pb-[88px]">
        <Container>
          <PricingBanner
            variant="compact"
            heading={`Run a recruitment agency in ${country.name}?`}
            freeHref={forAgenciesPath}
          />
        </Container>
      </section>
    </>
  );
}
