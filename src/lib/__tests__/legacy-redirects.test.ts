import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LEGACY_LOCATION_ALIASES,
  LEGACY_SPECIALIZATION_SLUGS,
  cleanLegacySegment,
  legacyLocationTarget,
  legacyRedirects,
} from "../legacy-redirects.ts";
import { isValidSlug } from "../routes.ts";

const none = { isCountry: false, cities: [] };
const madrid = { isCountry: false, cities: [{ countrySlug: "spain", citySlug: "madrid" }] };

/** The destination the fixed rules give a path (simple matcher for tests). */
function follow(path: string): string | null {
  for (const rule of legacyRedirects) {
    const names: string[] = [];
    const pattern = rule.source
      .replace(/[.]/g, "\\.")
      .replace(/\/:([a-z]+)\*/g, (_, name) => (names.push(name), "(?:/(.*))?"))
      .replace(/:([a-z]+)/g, (_, name) => (names.push(name), "([^/]+)"));
    const match = new RegExp(`^${pattern}$`).exec(path);
    if (!match) continue;
    return names.reduce(
      (destination, name, index) => destination.replace(`:${name}`, match[index + 1] ?? ""),
      rule.destination,
    );
  }
  return null;
}

test("every old specialization maps to a well-formed specialism slug", () => {
  assert.equal(Object.keys(LEGACY_SPECIALIZATION_SLUGS).length, 93);
  for (const [oldSlug, newSlug] of Object.entries(LEGACY_SPECIALIZATION_SLUGS)) {
    assert.ok(isValidSlug(oldSlug), oldSlug);
    assert.ok(isValidSlug(newSlug), newSlug);
  }
});

test("every rule is permanent and stays on this site", () => {
  for (const rule of legacyRedirects) {
    assert.equal(rule.permanent, true);
    assert.ok(rule.source.startsWith("/"), rule.source);
    assert.ok(rule.destination.startsWith("/"), rule.destination);
    assert.notEqual(rule.source, rule.destination);
  }
});

test("old fixed pages go to their new equivalents", () => {
  const expected: Record<string, string> = {
    "/about-us": "/about",
    "/contact-us": "/contact",
    "/legals": "/legal",
    "/list-your-agency": "/for-agencies",
    "/find-agency": "/search",
    "/search-results": "/search",
    "/specializations": "/specialisms",
    "/cities": "/countries",
    "/directory": "/",
    "/hubs/anything/else": "/",
    "/vendors": "/",
    "/why-use-recruiter": "/",
    "/for-job-seekers": "/",
    "/job-boost-engine": "/",
    "/job-boost-engine/results/abc": "/",
    "/agency-videos": "/",
    "/auth": "/for-agencies",
    "/admin": "/",
    "/admin/video-transcription": "/",
    "/jobseeker/dashboard": "/",
    "/registration-success": "/for-agencies",
    "/sitemap-agencies-2.xml": "/sitemap.xml",
    "/sitemap-static.xml": "/sitemap.xml",
  };
  for (const [from, to] of Object.entries(expected)) assert.equal(follow(from), to, from);
});

test("older agency addresses go to /agencies/<slug>; account pages do not", () => {
  assert.equal(follow("/agency/recruitment-acme-london"), "/agencies/recruitment-acme-london");
  assert.equal(follow("/recruitment-agency/recruitment-acme-london"), "/agencies/recruitment-acme-london");
  assert.equal(follow("/videos/recruitment-acme-london"), "/agencies/recruitment-acme-london");
  assert.equal(follow("/agencies/recruitment-acme-london/videos"), "/agencies/recruitment-acme-london");
  assert.equal(follow("/agency/dashboard"), "/for-agencies");
  assert.equal(follow("/agency/subscription"), "/for-agencies");
});

test("old specialization pages go to the matching specialism, or the list", () => {
  assert.equal(follow("/specialization/it-technology"), "/specialisms/information-technology");
  assert.equal(follow("/specialization/oil-gas"), "/specialisms/energy-renewables");
  assert.equal(follow("/specialization/unknown-thing"), "/specialisms");
});

test("addresses the new site uses are left alone", () => {
  for (const path of ["/", "/spain", "/spain/madrid", "/agencies/caroo-manchester", "/search",
    "/specialisms/legal", "/countries", "/for-agencies", "/sitemap.xml", "/sitemaps/cities.xml"]) {
    assert.equal(follow(path), null, path);
  }
});

test("old location segments are tidied before lookup", () => {
  assert.equal(cleanLegacySegment("Halle-Saale-"), "halle-saale");
  assert.equal(cleanLegacySegment("new%20york"), "new-york");
  assert.equal(cleanLegacySegment("%E0%A4%A"), "e0-a4-a");
});

test("an old country location goes to the country page", () => {
  const spain = { isCountry: true, cities: [] };
  assert.equal(legacyLocationTarget("spain", null, spain), "/spain");
  // No country + specialism page exists: the country page is the nearest.
  assert.equal(legacyLocationTarget("spain", "legal", spain), "/spain");
  // Singapore is both a country and a city: the country wins.
  assert.equal(
    legacyLocationTarget("singapore", null, {
      isCountry: true,
      cities: [{ countrySlug: "singapore", citySlug: "singapore" }],
    }),
    "/singapore",
  );
});

test("an old city location goes to the city, or city + specialism", () => {
  assert.equal(legacyLocationTarget("madrid", null, madrid), "/spain/madrid");
  assert.equal(legacyLocationTarget("madrid", "it-technology", madrid), "/spain/madrid/information-technology");
  assert.equal(legacyLocationTarget("madrid", "no-such-thing", madrid), "/spain/madrid");
});

test("a city name shared by several countries goes to the largest", () => {
  const brisbane = {
    isCountry: false,
    cities: [
      { countrySlug: "australia", citySlug: "brisbane" },
      { countrySlug: "united-states", citySlug: "brisbane" },
    ],
  };
  assert.equal(legacyLocationTarget("brisbane", null, brisbane), "/australia/brisbane");
});

test("old local spellings go to the renamed city", () => {
  assert.equal(legacyLocationTarget("den-haag", null, none), "/netherlands/the-hague");
  assert.equal(legacyLocationTarget("duesseldorf", "engineering", none), "/germany/dusseldorf/engineering");
  for (const [country, city] of Object.values(LEGACY_LOCATION_ALIASES)) {
    assert.ok(isValidSlug(country) && isValidSlug(city));
  }
});

test("an unknown location goes to the list of countries", () => {
  assert.equal(legacyLocationTarget("atlantis", null, none), "/countries");
  assert.equal(legacyLocationTarget("atlantis", "legal", none), "/countries");
});
