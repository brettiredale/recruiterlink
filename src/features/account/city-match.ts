/**
 * Matching what an agency types against the cities already in the
 * directory, for the city picker on the "Add your agency" form. Pure, so it
 * is unit tested and runs the same in the browser and on the server.
 */

export type CityChoice = {
  id: number;
  name: string;
  /** Published agencies already listed in the city. */
  agencies: number;
};

/** Lower case, accents removed, spaces tidied: "  Malmö " → "malmo". */
export function foldCityText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The part of what was typed that names the city. People often add the
 * state or region ("Miami, Florida"), so only the text before the first
 * comma is matched.
 */
export function cityQueryCore(query: string): string {
  return query.split(",")[0].replace(/\s+/g, " ").trim();
}

/**
 * The best matches for what was typed: names that start with it first,
 * then names with a word that starts with it, then names that contain it.
 * Within each group the cities with the most agencies come first. With
 * nothing typed, the cities with the most agencies.
 */
export function rankCities(cities: readonly CityChoice[], query: string, limit: number): CityChoice[] {
  const wanted = foldCityText(cityQueryCore(query));
  const byAgencies = (a: CityChoice, b: CityChoice) =>
    b.agencies - a.agencies || a.name.localeCompare(b.name, "en");
  if (!wanted) return [...cities].sort(byAgencies).slice(0, limit);

  const starts: CityChoice[] = [];
  const wordStarts: CityChoice[] = [];
  const contains: CityChoice[] = [];
  for (const city of cities) {
    const name = foldCityText(city.name);
    if (name.startsWith(wanted)) starts.push(city);
    else if (` ${name}`.includes(` ${wanted}`)) wordStarts.push(city);
    else if (name.includes(wanted)) contains.push(city);
  }
  return [...starts.sort(byAgencies), ...wordStarts.sort(byAgencies), ...contains.sort(byAgencies)].slice(
    0,
    limit,
  );
}

/** The listed city whose name is exactly what was typed (ignoring case and accents), if any. */
export function exactCity(cities: readonly CityChoice[], query: string): CityChoice | undefined {
  const wanted = foldCityText(cityQueryCore(query));
  if (!wanted) return undefined;
  return cities.find((city) => foldCityText(city.name) === wanted);
}
