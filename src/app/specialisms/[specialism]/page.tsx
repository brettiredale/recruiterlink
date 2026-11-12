import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Breadcrumbs,
  CompactLinks,
  Container,
  CountryTile,
  FaqList,
  LinkList,
  PageIntro,
  PillGrid,
  PopularSearchLink,
  PricingBanner,
  SearchBox,
  SectionHeading,
} from "@/components";
import { getSpecialismOverview, getSpecialisms } from "@/lib/directory";
import {
  citySpecialismPath,
  countryPath,
  forAgenciesPath,
  isValidSlug,
  specialismPath,
  specialismsPath,
} from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import {
  genericLast,
  isGenericSpecialism,
  sentenceList,
  specialismAgenciesPhrase,
  specialismHeading,
  specialismInPlaceHeading,
  specialismLabel,
} from "@/lib/specialisms";
import { agencyCountLabel } from "@/lib/text";

export const ensureStatic = "navigation";

/** Cities listed for a specialism. */
const TOP_CITIES = 48;

export async function generateStaticParams() {
  const specialisms = await getSpecialisms();
  return specialisms.map((specialism) => ({ specialism: specialism.slug }));
}

type Props = PageProps<"/specialisms/[specialism]">;

async function loadSpecialism(slug: string) {
  if (!isValidSlug(slug)) return null;
  const specialisms = await getSpecialisms();
  const specialism = specialisms.find((item) => item.slug === slug);
  return specialism ? { specialism, specialisms } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { specialism: slug } = await params;
  const loaded = await loadSpecialism(slug);
  if (!loaded) return {};
  const { specialism } = loaded;
  return pageMetadata({
    title: `${specialismHeading(specialism)} worldwide`,
    description: `Find ${specialismAgenciesPhrase(specialism)} by country and city. ${agencyCountLabel(specialism.agencyCount)} on RecruiterLink list ${specialismLabel(specialism)} as a specialism.`,
    path: specialismPath(specialism.slug),
    // The generic specialisms are on most agencies and say little.
    indexable: !isGenericSpecialism(specialism.slug),
  });
}

export default async function SpecialismPage({ params }: Props) {
  const { specialism: slug } = await params;
  const loaded = await loadSpecialism(slug);
  if (!loaded) notFound();
  const { specialism, specialisms } = loaded;

  const overview = await getSpecialismOverview(specialism.id, TOP_CITIES);
  const heading = specialismHeading(specialism);
  const phrase = specialismAgenciesPhrase(specialism);
  const label = specialismLabel(specialism);
  const path = specialismPath(specialism.slug);
  const cities = overview.cities;
  const others = genericLast(specialisms).filter((item) => item.id !== specialism.id);
  const topCountries = overview.countries.slice(0, 3);
  const topCities = cities.slice(0, 3);

  const faqs = [
    {
      question: `How many ${phrase} does RecruiterLink list?`,
      answer: `${agencyCountLabel(specialism.agencyCount)} on RecruiterLink list ${label} as a specialism, in ${overview.countries.length} ${overview.countries.length === 1 ? "country" : "countries"}.`,
    },
    ...(topCountries.length >= 2
      ? [
          {
            question: `Which countries have the most ${phrase}?`,
            answer: `${sentenceList(
              topCountries.map(
                (country) =>
                  `${country.name} (${country.specialismAgencyCount.toLocaleString("en")})`,
              ),
            )} have the most in our directory.`,
          },
        ]
      : []),
    ...(topCities.length >= 2
      ? [
          {
            question: `Which cities have the most ${phrase}?`,
            answer: `${sentenceList(
              topCities.map(
                (city) => `${city.name} (${city.specialismAgencyCount.toLocaleString("en")})`,
              ),
            )} have the most in our directory.`,
          },
        ]
      : []),
  ];

  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "Specialisms", href: specialismsPath },
            { label: specialism.name, href: path },
          ]}
        />
      </Container>

      <PageIntro
        eyebrow={`${agencyCountLabel(specialism.agencyCount)} · ${overview.countries.length} ${overview.countries.length === 1 ? "country" : "countries"}`}
        title={heading}
        intro={`Recruitment agencies that list ${label} as a specialism, by country and by city. Choose a city to see its agencies.`}
      >
        <SearchBox
          variant="compact"
          placeholder={`${specialism.name} recruiters in ${cities[0]?.name ?? "London"}`}
          formLabel={`Search ${phrase}`}
          className="mt-1"
        />
      </PageIntro>

      {cities.length > 0 ? (
        <section id="cities" aria-labelledby="cities-heading" className="py-10 sm:py-12">
          <Container>
            <SectionHeading
              id="cities-heading"
              title={`${heading} by city`}
              description={`The ${cities.length} cities with the most. Each has a page listing its agencies.`}
              size="sm"
            />
            <LinkList>
              {cities.map((city) => (
                <PopularSearchLink
                  key={city.id}
                  label={`${specialismInPlaceHeading(specialism, city.name)}${
                    city.name === city.country.name ? "" : `, ${city.country.name}`
                  }`}
                  count={city.specialismAgencyCount}
                  href={citySpecialismPath(city.country.slug, city.slug, specialism.slug)}
                />
              ))}
            </LinkList>
          </Container>
        </section>
      ) : null}

      {overview.countries.length > 0 ? (
        <section id="countries" aria-labelledby="countries-heading" className="py-10 sm:py-12">
          <Container>
            <div className="rounded-panel bg-lavender px-5 py-10 sm:px-10 lg:px-14">
              <SectionHeading
                id="countries-heading"
                title={`${heading} by country`}
                description={`How many agencies in each country list ${label}. Choose a country to browse its cities.`}
                size="sm"
              />
              <PillGrid>
                {overview.countries.map((country) => (
                  <CountryTile
                    key={country.id}
                    name={country.name}
                    count={country.specialismAgencyCount}
                    href={countryPath(country.slug)}
                  />
                ))}
              </PillGrid>
            </div>
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="faq-heading" className="py-10 sm:py-12">
        <Container width="narrow">
          <SectionHeading
            id="faq-heading"
            title={`${heading}: questions and answers`}
            size="sm"
            className="!mb-[18px]"
          />
          <FaqList items={faqs} />
        </Container>
      </section>

      <section aria-labelledby="others-heading" className="py-10 sm:py-12">
        <Container>
          <SectionHeading id="others-heading" title="Other specialisms" size="sm" />
          <CompactLinks
            countNoun={["agency", "agencies"]}
            className="!grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))]"
            links={others.map((item) => ({
              label: item.name,
              href: specialismPath(item.slug),
              count: item.agencyCount,
            }))}
          />
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
