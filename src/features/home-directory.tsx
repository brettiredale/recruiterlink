/**
 * The part of the home page that depends on the visitor's country:
 * featured agencies, cities, specialisms and popular searches (with the
 * "who it is for" panels sitting between them, as designed).
 *
 * `HomeDirectory` is cached and identical for everyone who gets the same
 * country (or the worldwide version, `countrySlug` null). The page picks
 * which one to show; see `src/app/page.tsx`.
 */
import { cityLabel } from "@/lib/regions";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import {
  AgencyGrid,
  AgencyCard,
  ButtonLink,
  CityPillLink,
  Container,
  FeaturedAgencyCard,
  LinkList,
  PillGrid,
  PopularSearchLink,
  SectionHeading,
  SpecialismChip,
  agencyCardProps,
} from "@/components";
import { PinIcon } from "@/components/icons";
import { COUNTRIES_TAG, DIRECTORY_TAG, countryTag } from "@/lib/cache-tags";
import {
  getCountries,
  getCountryCities,
  getCountrySpecialisms,
  getFeaturedAgencies,
  getPopularSearches,
  getSpecialisms,
  getTopCities,
  getTotals,
} from "@/lib/directory";
import {
  cityPath,
  citySpecialismPath,
  countriesPath,
  countryPath,
  specialismPath,
  specialismsPath,
} from "@/lib/routes";
import { specialismInPlaceHeading, withoutGeneric } from "@/lib/specialisms";
import { agencyCountLabel, firstSentence } from "@/lib/text";

/** One large card and twelve standard ones, as designed. */
const FEATURED = 13;
const CITIES = 8;
const WORLD_CITIES = 12;
const SPECIALISMS = 12;
const POPULAR_SEARCHES = 12;

/**
 * A country gets its own version of the home page only when it has enough
 * agencies to fill the featured section; smaller ones get the worldwide
 * version.
 */
export const MIN_AGENCIES_FOR_HOME_COUNTRY = FEATURED;

/** The country to personalise for, from a two-letter code such as "ES". */
export async function homeCountrySlugFor(iso2: string | null): Promise<string | null> {
  if (!iso2 || !/^[A-Za-z]{2}$/.test(iso2)) return null;
  const countries = await getCountries();
  const country = countries.find((item) => item.iso2 === iso2.toUpperCase());
  return country && country.agencyCount >= MIN_AGENCIES_FOR_HOME_COUNTRY
    ? country.slug
    : null;
}

async function loadHomeDirectory(countrySlug: string | null) {
  const countries = await getCountries();
  const country = countrySlug
    ? (countries.find((item) => item.slug === countrySlug) ?? null)
    : null;

  if (country) {
    const [featured, cities, specialisms] = await Promise.all([
      getFeaturedAgencies({ id: country.id, slug: country.slug }, FEATURED),
      getCountryCities(country.slug),
      getCountrySpecialisms(country.id, country.slug),
    ]);
    const searches = await getPopularSearches(
      cities.slice(0, 40).map((city) => ({
        id: city.id,
        name: city.name,
        slug: city.slug,
        regionCode: city.region?.code ?? null,
        countrySlug: country.slug,
        agencyCount: city.agencyCount,
      })),
      countryTag(country.slug),
      POPULAR_SEARCHES,
      3,
    );
    return {
      country,
      featured,
      cities: cities.slice(0, CITIES),
      cityCount: country.cityCount,
      specialisms,
      searches,
      agencyCount: country.agencyCount,
      countryCount: countries.length,
    };
  }

  const [featured, cities, specialisms, totals] = await Promise.all([
    getFeaturedAgencies(null, FEATURED),
    getTopCities(WORLD_CITIES),
    getSpecialisms(),
    getTotals(),
  ]);
  const searches = await getPopularSearches(
    cities.map((city) => ({
      id: city.id,
      name: city.name,
      slug: city.slug,
      regionCode: city.region?.code ?? null,
      countrySlug: city.country.slug,
      agencyCount: city.agencyCount,
    })),
    COUNTRIES_TAG,
    POPULAR_SEARCHES,
    2,
  );
  return {
    country: null,
    featured,
    cities,
    cityCount: totals.cityCount,
    specialisms: [...specialisms].sort((a, b) => b.agencyCount - a.agencyCount),
    searches,
    agencyCount: totals.agencyCount,
    countryCount: totals.countryCount,
  };
}

const linkClass =
  "inline-flex min-h-11 items-center text-[17px] font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep";

function WhoItIsFor() {
  return (
    <section aria-label="Who RecruiterLink is for" className="py-10">
      <Container className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3.5 rounded-feature bg-[linear-gradient(to_bottom_right,var(--color-cream),var(--color-pink-tint))] px-6 py-10 sm:px-11">
          <p className="label-mono text-sm text-pink-text">If you are hiring</p>
          <h2 className="font-heading text-[28px] leading-[1.12] font-extrabold tracking-[-0.03em] text-balance sm:text-[32px]">
            Find the agency that already knows your market.
          </h2>
          <ul className="mt-1.5 flex flex-col gap-2.5 text-lg">
            <li>Agencies that specialise in the roles you need</li>
            <li>Recruiters based in your city</li>
            <li>Go straight to their profile and get in touch</li>
          </ul>
        </div>
        <div className="flex flex-col gap-3.5 rounded-feature bg-lavender px-6 py-10 sm:px-11">
          <p className="label-mono text-sm text-indigo-deep">If you are job hunting</p>
          <h2 className="font-heading text-[28px] leading-[1.12] font-extrabold tracking-[-0.03em] text-balance sm:text-[32px]">
            Find the recruiters who place people like you.
          </h2>
          <ul className="mt-1.5 flex flex-col gap-2.5 text-lg">
            <li>Recruiters who work in your field</li>
            <li>Agencies in the city or country you want</li>
            <li>Go straight to their profile and get in touch</li>
          </ul>
        </div>
      </Container>
    </section>
  );
}

export async function HomeDirectory({ countrySlug }: { countrySlug: string | null }) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, COUNTRIES_TAG);

  const data = await loadHomeDirectory(countrySlug);
  const { country, featured } = data;
  const where = country ? ` in ${country.name}` : "";
  const [lead, ...rest] = featured;
  const beside = rest.slice(0, 4);
  const below = rest.slice(4);
  const chips = withoutGeneric(data.specialisms).slice(0, SPECIALISMS);
  const browseHref = country ? countryPath(country.slug) : countriesPath;

  return (
    <>
      <div className="bg-[linear-gradient(to_bottom,rgba(76,87,230,0.03),rgba(76,87,230,0))] pt-1">
        <Container>
          <p className="flex flex-wrap items-center justify-center gap-x-2 max-[420px]:flex-col text-center text-base font-semibold text-muted">
            <PinIcon size={18} className="shrink-0" />
            <span>
              {country ? `Showing agencies in ${country.name}` : "Showing agencies worldwide"}
            </span>
            <span aria-hidden="true" className="max-[420px]:hidden">
              ·
            </span>
            <Link href={countriesPath} className={`${linkClass} !text-base !font-semibold`}>
              {country ? "Change country" : "Choose a country"}
            </Link>
          </p>
        </Container>
      </div>

      {lead ? (
        <section id="featured" aria-labelledby="featured-heading" className="pt-10 pb-10 sm:pt-12">
          <Container>
            <SectionHeading
              id="featured-heading"
              title={`Featured recruitment agencies${where}`}
              size="lg"
              className="!mb-[30px]"
              action={{
                label: country
                  ? `View all ${agencyCountLabel(data.agencyCount)}`
                  : `Browse all ${data.countryCount} countries`,
                href: browseHref,
              }}
            />
            <div className="flex flex-wrap items-stretch gap-4 sm:gap-[22px]">
              <FeaturedAgencyCard
                name={lead.name}
                href={agencyCardProps(lead).href}
                city={lead.city ? cityLabel(lead.city) : undefined}
                country={lead.country.name}
                logoFile={lead.logoPath}
                summary={firstSentence(lead.introduction, 170) || null}
                specialisms={agencyCardProps(lead).specialisms}
                premium={lead.plan === "premium"}
                className="flex-[1_1_420px]"
              />
              {beside.length > 0 ? (
                <AgencyGrid className="min-w-0 flex-[1_1_560px]">
                  {beside.map((agency) => (
                    <AgencyCard key={agency.id} {...agencyCardProps(agency)} />
                  ))}
                </AgencyGrid>
              ) : null}
            </div>
            {below.length > 0 ? (
              <AgencyGrid className="mt-4 sm:mt-[22px]">
                {below.map((agency) => (
                  <AgencyCard key={agency.id} {...agencyCardProps(agency)} />
                ))}
              </AgencyGrid>
            ) : null}
            <p className="mt-9 text-center">
              <ButtonLink href={browseHref} variant="navy" className="max-sm:w-full">
                {country
                  ? `See all ${data.agencyCount.toLocaleString("en")} recruitment agencies in ${country.name}`
                  : `Browse all ${data.agencyCount.toLocaleString("en")} agencies by country`}
              </ButtonLink>
            </p>
          </Container>
        </section>
      ) : null}

      <WhoItIsFor />

      <section id="cities" aria-labelledby="cities-heading" className="pt-12 pb-6">
        <Container>
          <SectionHeading
            id="cities-heading"
            title={`Recruitment agencies${where} by city`}
            description="Every city has its own page listing all of its agencies."
            className="!mb-[26px]"
          />
          <PillGrid>
            {data.cities.map((city) => (
              <CityPillLink
                key={city.id}
                name={cityLabel(city)}
                count={city.agencyCount}
                href={cityPath(city.country.slug, city.slug)}
              />
            ))}
          </PillGrid>
          <p className="mt-[22px]">
            <Link
              href={country ? `${countryPath(country.slug)}#cities` : countriesPath}
              className={linkClass}
            >
              {country
                ? `All ${data.cityCount.toLocaleString("en")} towns and cities in ${country.name}`
                : `All ${data.cityCount.toLocaleString("en")} towns and cities, by country`}
            </Link>
          </p>
        </Container>
      </section>

      {chips.length > 0 ? (
        <section id="specialisms" aria-labelledby="specialisms-heading" className="pt-12 pb-6">
          <Container>
            <SectionHeading
              id="specialisms-heading"
              title={`Recruitment agencies${where} by specialism`}
              className="!mb-[26px]"
            />
            <ul className="flex flex-wrap gap-3">
              {chips.map((specialism) => (
                <li key={specialism.id} className="max-w-full">
                  <SpecialismChip
                    name={specialism.name}
                    count={specialism.agencyCount}
                    href={specialismPath(specialism.slug)}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-[22px]">
              <Link href={specialismsPath} className={linkClass}>
                All specialisms
              </Link>
            </p>
          </Container>
        </section>
      ) : null}

      {data.searches.length > 0 ? (
        <section aria-labelledby="searches-heading" className="pt-12 pb-6">
          <Container>
            <SectionHeading
              id="searches-heading"
              title={country ? `Popular searches in ${country.name}` : "Popular searches"}
              className="!mb-[26px]"
            />
            <LinkList>
              {data.searches.map((search) => (
                <PopularSearchLink
                  key={`${search.city.countrySlug}/${search.city.slug}/${search.specialism.slug}`}
                  label={specialismInPlaceHeading(search.specialism, cityLabel(search.city))}
                  href={citySpecialismPath(
                    search.city.countrySlug,
                    search.city.slug,
                    search.specialism.slug,
                  )}
                />
              ))}
            </LinkList>
          </Container>
        </section>
      ) : null}
    </>
  );
}
