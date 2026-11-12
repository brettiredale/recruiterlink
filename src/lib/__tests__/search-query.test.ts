import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findSpecialismSlug,
  normaliseQuery,
  placeGuesses,
  planSearch,
  slugifyText,
  splitPlace,
  stripFillerWords,
  type PlaceLookup,
} from "../search-query.ts";

const specialisms = [
  { slug: "information-technology", name: "Information Technology" },
  { slug: "executive-search", name: "Executive Search" },
  { slug: "legal", name: "Legal" },
  { slug: "marketing-communications", name: "Marketing & Communications" },
  { slug: "accounting-finance", name: "Accounting & Finance" },
  { slug: "sales-business-development", name: "Sales & Business Development" },
  { slug: "creative-design", name: "Creative & Design" },
];

const spain = { slug: "spain", name: "Spain" };
const uk = { slug: "united-kingdom", name: "United Kingdom" };
const us = { slug: "united-states", name: "United States" };
const countries = [spain, uk, us];
// Largest first, as the real lookup returns them.
const cities = [
  { slug: "madrid", name: "Madrid", country: spain },
  { slug: "london", name: "London", country: uk },
  { slug: "birmingham", name: "Birmingham", country: uk },
  { slug: "birmingham", name: "Birmingham", country: us },
  { slug: "new-york", name: "New York", country: us },
  { slug: "malaga", name: "Málaga", country: spain },
  { slug: "reading", name: "Reading", country: uk },
];

const lookup: PlaceLookup = {
  async findCountry(slug) {
    return countries.find((country) => country.slug === slug) ?? null;
  },
  async findCity(citySlug, countrySlug) {
    return (
      cities.find(
        (city) => city.slug === citySlug && (!countrySlug || city.country.slug === countrySlug),
      ) ?? null
    );
  },
};

const plan = (query: string) => planSearch(query, specialisms, lookup);

test("slugs match the database's place slugs", () => {
  assert.equal(slugifyText("Málaga"), "malaga");
  assert.equal(slugifyText("  New   York "), "new-york");
  assert.equal(slugifyText("'s-Hertogenbosch"), "s-hertogenbosch");
  assert.equal(slugifyText("Sant Cugat del Vallès"), "sant-cugat-del-valles");
  assert.equal(slugifyText("!!!"), "");
});

test("queries are tidied and bounded", () => {
  assert.equal(normaliseQuery("  IT \n recruiters\tin   Madrid "), "IT recruiters in Madrid");
  assert.equal(normaliseQuery(undefined), "");
  assert.equal(normaliseQuery("x".repeat(500)).length, 200);
});

test("the place is the text after the last ' in '", () => {
  assert.deepEqual(splitPlace("IT recruiters in Madrid"), { text: "IT recruiters", place: "Madrid" });
  assert.deepEqual(splitPlace("jobs in finance in London"), { text: "jobs in finance", place: "London" });
  assert.deepEqual(splitPlace("recruiters IN New York"), { text: "recruiters", place: "New York" });
  assert.deepEqual(splitPlace("in Madrid"), { text: "", place: "Madrid" });
  assert.deepEqual(splitPlace("Berlin recruiters"), { text: "Berlin recruiters", place: null });
  assert.deepEqual(splitPlace("printing"), { text: "printing", place: null });
  assert.deepEqual(splitPlace("legal recruiters near me"), { text: "legal recruiters", place: null });
});

test("a place can be read as city + country, country or city", () => {
  assert.deepEqual(placeGuesses("Birmingham, USA"), [
    { citySlug: "birmingham", countrySlug: "united-states" },
    { countrySlug: "birmingham-usa" },
    { citySlug: "birmingham-usa" },
  ]);
  assert.deepEqual(placeGuesses("the UK"), [
    { countrySlug: "united-kingdom" },
    { citySlug: "the-uk" },
  ]);
});

test("filler words are dropped", () => {
  assert.equal(stripFillerWords("best IT recruitment agencies"), "IT");
  assert.equal(stripFillerWords("Find me a recruiter"), "");
  assert.equal(stripFillerWords("C++ developers"), "C++ developers");
});

test("specialisms are recognised by name, slug or everyday word", () => {
  assert.equal(findSpecialismSlug("IT", specialisms), "information-technology");
  assert.equal(findSpecialismSlug("tech", specialisms), "information-technology");
  assert.equal(findSpecialismSlug("Information Technology", specialisms), "information-technology");
  assert.equal(findSpecialismSlug("marketing & communications", specialisms), "marketing-communications");
  assert.equal(findSpecialismSlug("Marketing and Communications", specialisms), "marketing-communications");
  assert.equal(findSpecialismSlug("executive search", specialisms), "executive-search");
  assert.equal(findSpecialismSlug("web design", specialisms), "creative-design");
  assert.equal(findSpecialismSlug("plumbing", specialisms), null);
  // An alias whose specialism is not in the list is not returned.
  assert.equal(findSpecialismSlug("nursing", specialisms), null);
});

test("specialism + city", async () => {
  assert.deepEqual(await plan("IT recruiters in Madrid"), {
    query: "IT recruiters in Madrid",
    place: { country: spain, city: { slug: "madrid", name: "Madrid" } },
    suggestedPlace: null,
    specialismSlug: "information-technology",
    keywords: "",
  });
});

test("specialism + country, with an everyday country name", async () => {
  const result = await plan("legal recruitment agencies in the UK");
  assert.deepEqual(result.place, { country: uk, city: null });
  assert.equal(result.specialismSlug, "legal");
});

test("accents and case in the place do not matter", async () => {
  const result = await plan("sales recruiters in MÁLAGA");
  assert.equal(result.place?.city?.slug, "malaga");
  assert.equal(result.specialismSlug, "sales-business-development");
});

test("city, country picks the city in that country", async () => {
  assert.equal((await plan("recruiters in Birmingham"))?.place?.country.slug, "united-kingdom");
  assert.equal((await plan("recruiters in Birmingham, USA"))?.place?.country.slug, "united-states");
});

test("keywords that are not a specialism are searched as text within the place", async () => {
  assert.deepEqual(await plan("payroll specialists in London"), {
    query: "payroll specialists in London",
    place: { country: uk, city: { slug: "london", name: "London" } },
    suggestedPlace: null,
    specialismSlug: null,
    keywords: "payroll",
  });
});

test("only a place: every agency there", async () => {
  const result = await plan("recruitment agencies in Spain");
  assert.deepEqual(result.place, { country: spain, city: null });
  assert.equal(result.specialismSlug, null);
  assert.equal(result.keywords, "");
});

test("an unknown place leaves the whole text to be understood", async () => {
  assert.deepEqual(await plan("jobs in finance"), {
    query: "jobs in finance",
    place: null,
    suggestedPlace: null,
    specialismSlug: "accounting-finance",
    keywords: "",
  });
  const atlantis = await plan("IT recruiters in Atlantis");
  assert.equal(atlantis.place, null);
  assert.equal(atlantis.keywords, "IT Atlantis");
});

test("without ' in ', a place name is only suggested, never used as a filter", async () => {
  // "Reading" is a town, but could equally be part of an agency's name.
  assert.deepEqual(await plan("Reading"), {
    query: "Reading",
    place: null,
    suggestedPlace: { country: uk, city: { slug: "reading", name: "Reading" } },
    specialismSlug: null,
    keywords: "Reading",
  });
});

test("a specialism alone", async () => {
  const result = await plan("executive search firms");
  assert.equal(result.specialismSlug, "executive-search");
  assert.equal(result.place, null);
  assert.equal(result.keywords, "");
});

test("an empty search", async () => {
  assert.deepEqual(await plan("   "), {
    query: "",
    place: null,
    suggestedPlace: null,
    specialismSlug: null,
    keywords: "",
  });
});
