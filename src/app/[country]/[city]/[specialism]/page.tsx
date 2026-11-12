import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CityListingPage,
  cityListingMetadata,
  loadCityListing,
} from "@/features/city-listing";
import { getCitySpecialisms, getTopCities } from "@/lib/directory";
import { withoutGeneric } from "@/lib/specialisms";

export const ensureStatic = "navigation";

/** Built ahead of time: the three biggest specialisms of the largest cities. */
export async function generateStaticParams() {
  const cities = await getTopCities(8);
  const sets = await Promise.all(
    cities.map(async (city) => {
      const specialisms = await getCitySpecialisms({
        id: city.id,
        slug: city.slug,
        countrySlug: city.country.slug,
      });
      return withoutGeneric(specialisms)
        .slice(0, 3)
        .map((specialism) => ({
          country: city.country.slug,
          city: city.slug,
          specialism: specialism.slug,
        }));
    }),
  );
  return sets.flat();
}

type Props = PageProps<"/[country]/[city]/[specialism]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, city, specialism } = await params;
  return cityListingMetadata(await loadCityListing({ country, city, specialism, page: 1 }));
}

export default async function CitySpecialismPage({ params }: Props) {
  const { country, city, specialism } = await params;
  const listing = await loadCityListing({ country, city, specialism, page: 1 });
  if (!listing) notFound();
  return <CityListingPage listing={listing} />;
}
