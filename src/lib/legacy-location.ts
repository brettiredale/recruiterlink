import { getCitiesBySlug, getCity, getCitySpecialisms, getCountry } from "./directory";
import { cleanLegacySegment, legacyLocationTarget } from "./legacy-redirects";
import { isValidSlug } from "./routes";

/**
 * Permanent redirect for an old-site location address
 * (`/recruiters-in/<location>[/<specialization>]`). The old site used one
 * slug for countries and cities alike, so the database is asked which it is.
 */
export async function legacyLocationRedirect(
  request: Request,
  locationSegment: string,
  specializationSegment: string | null,
): Promise<Response> {
  const location = cleanLegacySegment(locationSegment);
  const specialization = specializationSegment
    ? cleanLegacySegment(specializationSegment)
    : null;

  let target = "/countries";
  if (isValidSlug(location)) {
    const [country, cities] = await Promise.all([
      getCountry(location),
      getCitiesBySlug(location),
    ]);
    target = legacyLocationTarget(location, specialization, {
      isCountry: country !== null && country.agencyCount > 0,
      cities: cities.map((city) => ({
        countrySlug: city.country.slug,
        citySlug: city.slug,
      })),
    });

    // A city + specialism address is only used when that city really has
    // agencies for the specialism; otherwise the city page is the closest.
    const [countrySlug, citySlug, specialismSlug] = target.slice(1).split("/");
    if (specialismSlug) {
      const city = await getCity(countrySlug, citySlug);
      const specialisms = city
        ? await getCitySpecialisms({ id: city.id, slug: city.slug, countrySlug })
        : [];
      if (!specialisms.some((item) => item.slug === specialismSlug)) {
        target = city ? `/${countrySlug}/${citySlug}` : "/countries";
      }
    }
  }

  return new Response(null, {
    status: 308,
    headers: {
      Location: new URL(target, request.url).toString(),
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
