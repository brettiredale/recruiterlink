/**
 * States, provinces and territories: what each country calls them, and the
 * short "City, ST" label cities are shown with.
 */

/** What a country's regions are called, for form labels. */
export function regionLabel(iso2: string | null | undefined): string {
  switch (iso2) {
    case "CA":
      return "Province or territory";
    case "AU":
      return "State or territory";
    default:
      return "State";
  }
}

/** The region choices of each country that has them, keyed by country id. */
export type RegionChoices = Record<
  number,
  { label: string; options: { id: number; code: string; name: string }[] }
>;

export function buildRegionChoices(
  countries: { id: number; iso2: string | null }[],
  regions: { id: number; countryId: number; code: string; name: string }[],
): RegionChoices {
  const iso2ById = new Map(countries.map((country) => [country.id, country.iso2]));
  const choices: RegionChoices = {};
  for (const region of regions) {
    const entry = (choices[region.countryId] ??= {
      label: regionLabel(iso2ById.get(region.countryId)),
      options: [],
    });
    entry.options.push({ id: region.id, code: region.code, name: region.name });
  }
  for (const entry of Object.values(choices)) {
    entry.options.sort((a, b) => a.name.localeCompare(b.name, "en"));
  }
  return choices;
}

/**
 * A city as people read it: "Miami, FL" where the country has states,
 * "Manchester" elsewhere.
 */
export function cityLabel(city: {
  name: string;
  region?: { code: string } | null;
  regionCode?: string | null;
}): string {
  const code = city.region?.code ?? city.regionCode ?? null;
  return code ? `${city.name}, ${code}` : city.name;
}
