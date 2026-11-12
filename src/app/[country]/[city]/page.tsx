import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CityListingPage,
  cityListingMetadata,
  loadCityListing,
} from "@/features/city-listing";
import { getTopCities } from "@/lib/directory";

export const ensureStatic = "navigation";

/** Built ahead of time: the largest cities. Every other city is built on its first visit. */
export async function generateStaticParams() {
  const cities = await getTopCities(30);
  return cities.map((city) => ({ country: city.country.slug, city: city.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[country]/[city]">): Promise<Metadata> {
  const { country, city } = await params;
  return cityListingMetadata(await loadCityListing({ country, city, page: 1 }));
}

export default async function CityPage({ params }: PageProps<"/[country]/[city]">) {
  const { country, city } = await params;
  const listing = await loadCityListing({ country, city, page: 1 });
  if (!listing) notFound();
  return <CityListingPage listing={listing} />;
}
