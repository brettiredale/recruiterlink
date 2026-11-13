import type { NextRequest } from "next/server";
import { getCitySuggestions } from "@/lib/directory";

/**
 * City suggestions for the listing form: existing cities of a country whose
 * name starts with the typed text, so people pick the city we already have
 * instead of typing a new spelling. GET /api/cities?country=<id>&q=<text>
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const countryId = Number.parseInt(params.get("country") ?? "", 10);
  const typed = (params.get("q") ?? "").trim().slice(0, 80);
  if (!Number.isInteger(countryId) || countryId < 1 || countryId > 32767 || typed.length < 2) {
    return Response.json({ cities: [] });
  }
  const cities = await getCitySuggestions(countryId, typed.toLowerCase());
  return Response.json(
    {
      cities: cities.map((city) => ({
        name: city.name,
        regionCode: city.regionCode,
        agencyCount: city.agencyCount,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}
