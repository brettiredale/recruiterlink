import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CityListingPage,
  cityListingMetadata,
  loadCityListing,
} from "@/features/city-listing";
import { getCitySpecialisms, getTopCities } from "@/lib/directory";
import { AGENCIES_PER_PAGE, parsePageSegment } from "@/lib/routes";
import { withoutGeneric } from "@/lib/specialisms";

export const ensureStatic = "navigation";

/** Built ahead of time: page 2 of the largest city's biggest specialism. */
export async function generateStaticParams() {
  const [city] = await getTopCities(1);
  if (!city) return [];
  const specialisms = await getCitySpecialisms({
    id: city.id,
    slug: city.slug,
    countrySlug: city.country.slug,
  });
  const [specialism] = withoutGeneric(specialisms).filter(
    (item) => item.agencyCount > AGENCIES_PER_PAGE,
  );
  // The framework needs at least one address here; a page that does not
  // exist is simply answered "not found" when built.
  return [
    {
      country: city.country.slug,
      city: city.slug,
      specialism: specialism?.slug ?? specialisms[0]?.slug ?? "none",
      page: "2",
    },
  ];
}

type Props = PageProps<"/[country]/[city]/[specialism]/page/[page]">;

async function load(params: Props["params"]) {
  const { country, city, specialism, page: segment } = await params;
  const page = parsePageSegment(segment);
  return page === null ? null : loadCityListing({ country, city, specialism, page });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return cityListingMetadata(await load(params));
}

export default async function CitySpecialismLaterPage({ params }: Props) {
  const listing = await load(params);
  if (!listing) notFound();
  return <CityListingPage listing={listing} />;
}
