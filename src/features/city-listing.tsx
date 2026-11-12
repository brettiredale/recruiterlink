/**
 * The city page and the city + specialism page, including their later
 * pages (`/page/N`). One loader and one layout serve all four routes so
 * they cannot drift apart.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  AgencyList,
  Breadcrumbs,
  CityHero,
  CityPillLink,
  Container,
  EmptyState,
  FaqList,
  JsonLd,
  LinkList,
  Pagination,
  PillGrid,
  PopularSearchLink,
  PricingBanner,
  SearchBox,
  SectionHeading,
  SpecialismChip,
} from "@/components";
import {
  getCity,
  getCityAgencies,
  getCitySpecialisms,
  getCountryCities,
} from "@/lib/directory";
import { cityFaqs, citySpecialismFaqs } from "@/lib/faq";
import {
  isCitySpecialismIndexable,
  isPagedListIndexable,
} from "@/lib/indexability";
import {
  AGENCIES_PER_PAGE,
  cityPath,
  citySpecialismPath,
  countryPath,
  forAgenciesPath,
  isReservedTopLevelSlug,
  isValidSlug,
  pagedPath,
  specialismPath,
} from "@/lib/routes";
import { agencyListJsonLd, notFoundMetadata, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import {
  genericLast,
  specialismAgenciesPhrase,
  specialismInPlaceHeading,
  specialismLabel,
  withoutGeneric,
} from "@/lib/specialisms";
import { agencyCountLabel } from "@/lib/text";

const CITY_PHOTO_BASE =
  "https://ipfjjrngsjixgbmkezzg.supabase.co/storage/v1/object/public/city-photos/";

/** Specialism chips shown in the filter; the full list is further down. */
const FILTER_CHIPS = 10;
/** Other cities of the country shown as pills. */
const OTHER_CITIES = 11;

export type CityListingParams = {
  country: string;
  city: string;
  /** Specialism slug, on city + specialism pages. */
  specialism?: string;
  /** Page number, from 1. */
  page: number;
};

/** Everything the page shows, or null when the address is not a real page. */
export async function loadCityListing(params: CityListingParams) {
  if (
    !isValidSlug(params.country) ||
    isReservedTopLevelSlug(params.country) ||
    !isValidSlug(params.city) ||
    (params.specialism !== undefined && !isValidSlug(params.specialism))
  ) {
    return null;
  }

  const city = await getCity(params.country, params.city);
  if (!city || city.agencyCount === 0) return null;
  const cityKey = { id: city.id, slug: city.slug, countrySlug: city.country.slug };

  const specialisms = await getCitySpecialisms(cityKey);
  const specialism =
    params.specialism === undefined
      ? null
      : (specialisms.find((item) => item.slug === params.specialism) ?? null);
  // A specialism nobody in the city has is not a page.
  if (params.specialism !== undefined && !specialism) return null;

  // Past the last page is not a page (and the database need not be asked).
  const expected = specialism ? specialism.agencyCount : city.agencyCount;
  if (params.page > Math.max(Math.ceil(expected / AGENCIES_PER_PAGE), 1)) return null;

  const [agencies, countryCities] = await Promise.all([
    getCityAgencies(cityKey, params.page, specialism?.id),
    getCountryCities(city.country.slug),
  ]);
  // Counts and lists are cached separately, so check the list itself too.
  if (params.page > agencies.pageCount || agencies.items.length === 0) return null;

  const basePath = specialism
    ? citySpecialismPath(city.country.slug, city.slug, specialism.slug)
    : cityPath(city.country.slug, city.slug);
  const baseIndexable = specialism
    ? isCitySpecialismIndexable({
        cityAgencyCount: city.agencyCount,
        pairAgencyCount: specialism.agencyCount,
        specialismSlug: specialism.slug,
      })
    : city.isIndexable;
  const rank = countryCities.findIndex((other) => other.id === city.id);

  return {
    city,
    specialism,
    specialisms,
    agencies,
    page: params.page,
    basePath,
    path: pagedPath(basePath, params.page),
    indexable: isPagedListIndexable(params.page, baseIndexable),
    rankInCountry: rank === -1 ? null : rank + 1,
    otherCities: countryCities.filter((other) => other.id !== city.id),
    countryCityCount: countryCities.length,
  };
}

export type CityListing = NonNullable<Awaited<ReturnType<typeof loadCityListing>>>;

function listingHeading(listing: CityListing): string {
  return listing.specialism
    ? specialismInPlaceHeading(listing.specialism, listing.city.name)
    : `Recruitment agencies in ${listing.city.name}`;
}

export function cityListingMetadata(listing: CityListing | null): Metadata {
  if (!listing) return notFoundMetadata;
  const { city, specialism, page, agencies } = listing;
  const heading = listingHeading(listing);
  const pageNote = page > 1 ? ` (page ${page} of ${agencies.pageCount})` : "";
  const top = withoutGeneric(listing.specialisms)
    .slice(0, 3)
    .map((item) => specialismLabel(item));

  const description = specialism
    ? `Compare ${agencies.total.toLocaleString("en")} ${specialismAgenciesPhrase(specialism)} in ${city.name}, ${city.country.name}. See what each agency does and go straight to its website.${pageNote}`
    : `Browse ${agencies.total.toLocaleString("en")} ${agencies.total === 1 ? "recruitment agency" : "recruitment agencies"} in ${city.name}, ${city.country.name}${
        top.length >= 2 ? `, including specialists in ${top.join(", ")}` : ""
      }. Filter by specialism and go straight to each agency's website.${pageNote}`;

  return pageMetadata({
    title: `${heading}${city.name === city.country.name ? "" : `, ${city.country.name}`}${page > 1 ? `: page ${page}` : ""}`,
    description,
    path: listing.path,
    indexable: listing.indexable,
  });
}

export function CityListingPage({ listing }: { listing: CityListing }) {
  const { city, specialism, specialisms, agencies, page, basePath } = listing;
  const country = city.country;
  const heading = listingHeading(listing);
  const cityHref = cityPath(country.slug, city.slug);
  const ordered = genericLast(specialisms);
  const chips = withoutGeneric(specialisms).slice(0, FILTER_CHIPS);
  // Keep the chosen specialism visible in the filter even when it is small.
  if (specialism && !chips.some((item) => item.id === specialism.id)) {
    chips.push(specialism);
  }
  const first = (page - 1) * AGENCIES_PER_PAGE + 1;
  const last = first + agencies.items.length - 1;
  const otherCities = listing.otherCities.slice(0, OTHER_CITIES);

  const faqs =
    page > 1
      ? []
      : specialism
        ? citySpecialismFaqs({
            city: city.name,
            country: country.name,
            specialism,
            pairAgencyCount: specialism.agencyCount,
            cityAgencyCount: city.agencyCount,
          })
        : cityFaqs({
            city: city.name,
            country: country.name,
            agencyCount: city.agencyCount,
            rankInCountry: listing.rankInCountry,
            specialisms,
          });

  const listTitle = specialism
    ? `${heading}${page > 1 ? `, page ${page}` : ""}`
    : `All recruitment agencies in ${city.name}${page > 1 ? `, page ${page}` : ""}`;

  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: country.name, href: countryPath(country.slug) },
            { label: city.name, href: cityHref },
            ...(specialism ? [{ label: specialism.name, href: basePath }] : []),
          ]}
          className="pb-1"
        />
        <CityHero
          title={heading}
          eyebrow={
            specialism
              ? `${agencyCountLabel(specialism.agencyCount)} · ${city.name === country.name ? country.name : `${city.name}, ${country.name}`}`
              : `${agencyCountLabel(city.agencyCount)} · ${country.name}`
          }
          intro={
            specialism
              ? `Every agency we list in ${city.name} that gives ${specialismLabel(specialism)} as a specialism, whether you are hiring or looking for your next job.`
              : city.agencyCount === 1
                ? `The recruitment agency we list in ${city.name}, whether you are hiring or looking for your next job.`
                : `Every recruitment agency we list in ${city.name}, whether you are hiring or looking for your next job.`
          }
          photo={
            city.photoPath
              ? {
                  src: CITY_PHOTO_BASE + encodeURIComponent(city.photoPath),
                  alt: `${city.name}, ${country.name}`,
                }
              : null
          }
          aiGenerated
        />
      </Container>

      <section aria-label="Search and filter" className="pt-8 pb-2">
        <Container className="flex flex-col gap-[22px]">
          <SearchBox
            variant="compact"
            placeholder={`Web design recruiters in ${city.name}`}
            label={`Describe the agency you are looking for in ${city.name}`}
            formLabel={`Search agencies in ${city.name}`}
            hiddenFields={{ country: country.slug, city: city.slug }}
          />

          {chips.length > 0 ? (
            <nav aria-labelledby="filter-label" className="flex flex-col gap-3">
              <p id="filter-label" className="label-mono text-[13px] text-muted">
                Filter by specialism
              </p>
              <ul className="flex flex-wrap gap-2.5">
                <li>
                  <SpecialismChip
                    variant="filter"
                    name={`All ${city.agencyCount.toLocaleString("en")}`}
                    href={cityHref}
                    active={!specialism}
                  />
                </li>
                {chips.map((item) => (
                  <li key={item.id} className="max-w-full">
                    <SpecialismChip
                      variant="filter"
                      name={item.name}
                      count={item.agencyCount}
                      href={citySpecialismPath(country.slug, city.slug, item.slug)}
                      active={specialism?.id === item.id}
                    />
                  </li>
                ))}
                {ordered.length > chips.length ? (
                  <li>
                    <Link
                      href="#specialisms"
                      className="inline-flex min-h-11 items-center px-2 text-base font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
                    >
                      All {ordered.length} specialisms
                    </Link>
                  </li>
                ) : null}
              </ul>
            </nav>
          ) : null}
        </Container>
      </section>

      <section id="agencies" aria-labelledby="agencies-heading" className="pt-8 pb-10">
        <Container>
          <SectionHeading id="agencies-heading" title={listTitle} size="sm" />
          {agencies.items.length > 0 ? (
            <>
              <AgencyList agencies={agencies.items} minCardWidth={270} />
              <Pagination
                className="mt-[34px]"
                currentPage={page}
                totalPages={agencies.pageCount}
                basePath={basePath}
                label={heading}
                summary={
                  agencies.total === 1
                    ? "Showing the 1 agency"
                    : `Showing ${first.toLocaleString("en")} to ${last.toLocaleString("en")} of ${agencyCountLabel(agencies.total)}`
                }
              />
              <JsonLd
                data={agencyListJsonLd(heading, agencies.items, {
                  path: listing.path,
                  total: agencies.total,
                  startPosition: first,
                })}
              />
            </>
          ) : (
            <EmptyState
              title="No agencies to show"
              action={{ label: `All agencies in ${city.name}`, href: cityHref }}
            />
          )}
        </Container>
      </section>

      {ordered.length > 0 ? (
        <section id="specialisms" aria-labelledby="specialisms-heading" className="py-10">
          <Container>
            <div className="rounded-panel bg-lavender px-5 pt-12 pb-11 sm:px-10 lg:px-14">
              <SectionHeading
                id="specialisms-heading"
                title={`${city.name} recruitment agencies by specialism`}
                description="Each of these has a page of its own."
                size="sm"
                className="!mb-[22px]"
              />
              <LinkList className="!grid-cols-[repeat(auto-fill,minmax(min(420px,100%),1fr))] !gap-x-14">
                {ordered.map((item) => (
                  <PopularSearchLink
                    key={item.id}
                    tone="panel"
                    label={specialismInPlaceHeading(item, city.name)}
                    count={item.agencyCount}
                    href={citySpecialismPath(country.slug, city.slug, item.slug)}
                    className={specialism?.id === item.id ? "!font-extrabold" : undefined}
                  />
                ))}
              </LinkList>
              {specialism ? (
                <p className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[17px] font-bold">
                  <Link
                    href={cityHref}
                    className="text-indigo-deep underline underline-offset-4 hover:text-navy"
                  >
                    All {agencyCountLabel(city.agencyCount)} in {city.name}
                  </Link>
                  <Link
                    href={specialismPath(specialism.slug)}
                    className="text-indigo-deep underline underline-offset-4 hover:text-navy"
                  >
                    {specialism.name} agencies in other cities and countries
                  </Link>
                </p>
              ) : null}
            </div>
          </Container>
        </section>
      ) : null}

      {otherCities.length > 0 ? (
        <section id="cities" aria-labelledby="cities-heading" className="pt-10 pb-6">
          <Container>
            <SectionHeading
              id="cities-heading"
              title={`Other cities in ${country.name}`}
              size="sm"
            />
            <PillGrid>
              {otherCities.map((other) => (
                <CityPillLink
                  key={other.id}
                  name={other.name}
                  count={other.agencyCount}
                  href={cityPath(country.slug, other.slug)}
                />
              ))}
            </PillGrid>
            <p className="mt-[22px]">
              <Link
                href={`${countryPath(country.slug)}#cities`}
                className="inline-flex min-h-11 items-center text-[17px] font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
              >
                All {listing.countryCityCount.toLocaleString("en")} towns and cities in{" "}
                {country.name}
              </Link>
            </p>
          </Container>
        </section>
      ) : null}

      {faqs.length > 0 ? (
        <section aria-labelledby="faq-heading" className="pt-12 pb-16">
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
      ) : (
        <div className="h-12" />
      )}

      <section id="claim" className="pb-16 sm:pb-[88px]">
        <Container>
          <PricingBanner
            variant="compact"
            heading={`Run a recruitment agency in ${city.name}?`}
            freeHref={forAgenciesPath}
          />
        </Container>
      </section>
    </>
  );
}
