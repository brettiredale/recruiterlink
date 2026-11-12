import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AgencyList,
  Breadcrumbs,
  Container,
  CountryTile,
  EmptyState,
  PageIntro,
  PillGrid,
  SearchBox,
  SectionHeading,
  buttonClasses,
} from "@/components";
import type { AgencySummary } from "@/lib/data";
import {
  getCitiesBySlug,
  getCity,
  getCityAgencies,
  getCountries,
  getCountry,
  getCountryAgencies,
  getSearchResults,
  getSpecialisms,
} from "@/lib/directory";
import {
  AGENCIES_PER_PAGE,
  cityPath,
  citySpecialismPath,
  countriesPath,
  countryPath,
  isValidSlug,
  searchPath,
  specialismPath,
  specialismsPath,
} from "@/lib/routes";
import {
  planSearch,
  type PlaceLookup,
  type ResolvedPlace,
} from "@/lib/search-query";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { specialismHeading, specialismInPlaceHeading } from "@/lib/specialisms";
import { agencyCountLabel } from "@/lib/text";

// Search results are never indexed: they are endless variations of the
// country, city and specialism pages, which are the pages meant to rank.
export const metadata: Metadata = pageMetadata({
  title: "Search recruitment agencies",
  description:
    "Search RecruiterLink's directory of recruitment agencies by what they recruit for and where, for example \"IT recruiters in Madrid\".",
  path: searchPath,
  indexable: false,
});

/** Furthest page of results a search can reach. */
const MAX_PAGE = 40;

type Params = Awaited<PageProps<"/search">["searchParams"]>;

function first(value: Params[string]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const lookup: PlaceLookup = {
  async findCountry(slug) {
    if (!isValidSlug(slug)) return null;
    const country = await getCountry(slug);
    return country && country.agencyCount > 0
      ? { slug: country.slug, name: country.name }
      : null;
  },
  async findCity(citySlug, countrySlug) {
    if (!isValidSlug(citySlug) || (countrySlug && !isValidSlug(countrySlug))) return null;
    const [city] = await getCitiesBySlug(citySlug, countrySlug);
    return city
      ? {
          slug: city.slug,
          name: city.name,
          country: { slug: city.country.slug, name: city.country.name },
        }
      : null;
  },
};

/** The place a scoped search box (on a country or city page) sent along. */
async function scopePlace(params: Params): Promise<ResolvedPlace | null> {
  const countrySlug = first(params.country);
  const citySlug = first(params.city);
  if (!countrySlug || !isValidSlug(countrySlug)) return null;
  const country = await lookup.findCountry(countrySlug);
  if (!country) return null;
  if (citySlug && isValidSlug(citySlug)) {
    const city = await lookup.findCity(citySlug, countrySlug);
    if (city) return { country, city: { slug: city.slug, name: city.name } };
  }
  return { country, city: null };
}

function placeName(place: ResolvedPlace): string {
  return place.city
    ? place.city.name === place.country.name
      ? place.city.name
      : `${place.city.name}, ${place.country.name}`
    : place.country.name;
}

function placePath(place: ResolvedPlace): string {
  return place.city
    ? cityPath(place.country.slug, place.city.slug)
    : countryPath(place.country.slug);
}

function resultsHref(query: string, scope: ResolvedPlace | null, page: number): string {
  const params = new URLSearchParams({ q: query });
  if (scope) {
    params.set("country", scope.country.slug);
    if (scope.city) params.set("city", scope.city.slug);
  }
  if (page > 1) params.set("page", String(page));
  return `${searchPath}?${params.toString()}`;
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const params = await searchParams;
  const pageNumber = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isFinite(pageNumber) ? Math.min(Math.max(pageNumber, 1), MAX_PAGE) : 1;

  const [specialisms, scope] = await Promise.all([getSpecialisms(), scopePlace(params)]);
  const plan = await planSearch(first(params.q), specialisms, lookup);
  const query = plan.query;

  if (!query) {
    const countries = await getCountries();
    return (
      <>
        <SearchBox defaultValue="" className="!max-w-[860px]" />
        <section aria-labelledby="browse-heading" className="pt-10">
          <SectionHeading
            id="browse-heading"
            title="Or browse by country"
            description="Type what you need and where above, for example “IT recruiters in Madrid”, or pick a country."
            size="sm"
            action={{ label: "Browse by specialism", href: specialismsPath }}
          />
          <PillGrid>
            {countries.slice(0, 12).map((country) => (
              <CountryTile
                key={country.id}
                name={country.name}
                count={country.agencyCount}
                href={countryPath(country.slug)}
                className="!border-line"
              />
            ))}
          </PillGrid>
          <p className="mt-5">
            <Link
              href={countriesPath}
              className="inline-flex min-h-11 items-center text-[17px] font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
            >
              All {countries.length} countries
            </Link>
          </p>
        </section>
      </>
    );
  }

  // A place typed in the search wins over the page the search came from.
  const place = plan.place ?? scope;
  const specialism = plan.specialismSlug
    ? (specialisms.find((item) => item.slug === plan.specialismSlug) ?? null)
    : null;

  let items: AgencySummary[] = [];
  let total: number | null = null;
  let hasNext = false;
  /** The fixed page that shows the same list, when there is one. */
  let fullPage: { label: string; href: string } | null = null;
  let heading: string;

  if (place && (specialism || !plan.keywords)) {
    // A place, with or without a specialism: the same list its page shows.
    const name = placeName(place);
    heading = specialism
      ? specialismInPlaceHeading(specialism, name)
      : `Recruitment agencies in ${name}`;
    if (place.city) {
      const city = await getCity(place.country.slug, place.city.slug);
      if (city) {
        const result = await getCityAgencies(
          { id: city.id, slug: city.slug, countrySlug: city.country.slug },
          page,
          specialism?.id,
        );
        items = result.items;
        total = result.total;
        hasNext = page < result.pageCount;
        fullPage =
          result.total > 0
            ? {
                label: heading,
                href: specialism
                  ? citySpecialismPath(city.country.slug, city.slug, specialism.slug)
                  : cityPath(city.country.slug, city.slug),
              }
            : null;
      }
    } else {
      const country = await getCountry(place.country.slug);
      if (country) {
        const result = await getCountryAgencies(
          { id: country.id, slug: country.slug },
          page,
          specialism?.id,
        );
        items = result.items;
        total = result.total;
        hasNext = page < result.pageCount;
        fullPage = {
          label: `Recruitment agencies in ${country.name}, by city`,
          href: countryPath(country.slug),
        };
      }
    }
  } else {
    // Keywords (or a specialism with no place): full-text search.
    const text = specialism ? `"${specialism.name}"` : plan.keywords || query;
    heading = specialism
      ? specialismHeading(specialism)
      : place
        ? `Agencies matching “${plan.keywords}” in ${placeName(place)}`
        : `Agencies matching “${plan.keywords || query}”`;
    const found = await getSearchResults(text, {
      countrySlug: place?.country.slug,
      citySlug: place?.city?.slug,
      limit: AGENCIES_PER_PAGE + 1,
      offset: (page - 1) * AGENCIES_PER_PAGE,
    });
    items = found.slice(0, AGENCIES_PER_PAGE);
    hasNext = found.length > AGENCIES_PER_PAGE && page < MAX_PAGE;
    if (specialism) {
      fullPage = {
        label: `${specialismHeading(specialism)} by country and city`,
        href: specialismPath(specialism.slug),
      };
    }
  }

  const firstShown = (page - 1) * AGENCIES_PER_PAGE + 1;
  const lastShown = firstShown + items.length - 1;
  const suggestion = !place ? plan.suggestedPlace : null;

  return (
    <>
      <SearchBox
        defaultValue={query}
        hiddenFields={
          scope
            ? { country: scope.country.slug, ...(scope.city ? { city: scope.city.slug } : {}) }
            : undefined
        }
        className="!max-w-[860px]"
      />
      {scope ? (
        <p className="mt-3 text-base text-muted">
          Searching in {placeName(scope)}.{" "}
          <Link
            href={resultsHref(query, null, 1)}
            className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
          >
            Search everywhere
          </Link>
        </p>
      ) : null}

      <section aria-labelledby="results-heading" className="pt-10">
        <SectionHeading
          id="results-heading"
          title={heading}
          size="sm"
          description={
            items.length === 0
              ? undefined
              : total !== null
                ? total <= AGENCIES_PER_PAGE
                  ? agencyCountLabel(total)
                  : `Showing ${firstShown.toLocaleString("en")} to ${lastShown.toLocaleString("en")} of ${agencyCountLabel(total)}`
                : page > 1 || hasNext
                  ? `Showing results ${firstShown.toLocaleString("en")} to ${lastShown.toLocaleString("en")}, best matches first`
                  : `${items.length} ${items.length === 1 ? "result" : "results"}, best matches first`
          }
        />

        {fullPage || suggestion ? (
          <p className="-mt-2 mb-6 flex flex-wrap gap-x-8 gap-y-1 text-[17px] font-bold">
            {fullPage ? (
              <Link
                href={fullPage.href}
                className="inline-flex min-h-11 items-center text-indigo underline underline-offset-4 hover:text-indigo-deep"
              >
                Go to the page: {fullPage.label}
              </Link>
            ) : null}
            {suggestion ? (
              <Link
                href={placePath(suggestion)}
                className="inline-flex min-h-11 items-center text-indigo underline underline-offset-4 hover:text-indigo-deep"
              >
                See all recruitment agencies in {placeName(suggestion)}
              </Link>
            ) : null}
          </p>
        ) : null}

        {items.length > 0 ? (
          <>
            <AgencyList agencies={items} minCardWidth={270} />
            {page > 1 || hasNext ? (
              <nav
                aria-label="Search result pages"
                className="mt-[34px] flex flex-wrap items-center justify-center gap-3"
              >
                {page > 1 ? (
                  <Link
                    href={resultsHref(query, scope, page - 1)}
                    rel="prev"
                    className={buttonClasses("outline", "!rounded-btn !border-navy !text-[17px]")}
                  >
                    Previous page
                  </Link>
                ) : null}
                <span className="px-2 font-mono text-[15px] font-bold">Page {page}</span>
                {hasNext ? (
                  <Link
                    href={resultsHref(query, scope, page + 1)}
                    rel="next"
                    className={buttonClasses("navy", "!text-[17px]")}
                  >
                    Next page
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        ) : (
          <EmptyState
            headingLevel="h3"
            title={page > 1 ? "No more results" : "No agencies matched your search"}
            description={
              place
                ? `Try different words, or look at every agency we list in ${placeName(place)}.`
                : "Try fewer or different words, add a place such as “in London”, or browse by country."
            }
            action={
              place
                ? { label: `Agencies in ${placeName(place)}`, href: placePath(place) }
                : { label: "Browse countries", href: countriesPath }
            }
            secondaryAction={{ label: "Browse specialisms", href: specialismsPath }}
          />
        )}
      </section>
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "Search", href: searchPath },
          ]}
        />
      </Container>
      <PageIntro
        title="Search recruitment agencies"
        intro="Describe what you need and where, for example “IT recruiters in Madrid” or “executive search in New York”."
        className="!pb-6"
      />
      <Container className="pb-16 sm:pb-[88px]">
        <Suspense
          fallback={
            <>
              <SearchBox className="!max-w-[860px]" />
              <p role="status" className="pt-10 text-lg text-muted">
                Searching…
              </p>
            </>
          }
        >
          <Results searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}
