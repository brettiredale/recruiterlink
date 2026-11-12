import { getCitiesBySlug, getCountry } from "./directory";
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
  }

  return new Response(null, {
    status: 308,
    headers: {
      Location: new URL(target, request.url).toString(),
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
