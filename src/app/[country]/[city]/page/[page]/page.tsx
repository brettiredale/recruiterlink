import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CityListingPage,
  cityListingMetadata,
  loadCityListing,
} from "@/features/city-listing";
import { getTopCities } from "@/lib/directory";
import { AGENCIES_PER_PAGE, parsePageSegment } from "@/lib/routes";

export const ensureStatic = "navigation";

/** Built ahead of time: page 2 of the largest cities. */
export async function generateStaticParams() {
  const cities = await getTopCities(5);
  return cities
    .filter((city) => city.agencyCount > AGENCIES_PER_PAGE)
    .map((city) => ({ country: city.country.slug, city: city.slug, page: "2" }));
}

type Props = PageProps<"/[country]/[city]/page/[page]">;

async function load(params: Props["params"]) {
  const { country, city, page: segment } = await params;
  const page = parsePageSegment(segment);
  return page === null ? null : loadCityListing({ country, city, page });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return cityListingMetadata(await load(params));
}

export default async function CityLaterPage({ params }: Props) {
  const listing = await load(params);
  if (!listing) notFound();
  return <CityListingPage listing={listing} />;
}
