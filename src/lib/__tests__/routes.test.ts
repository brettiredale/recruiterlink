import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  agencyPath,
  cityPath,
  citySpecialismPath,
  countryPath,
  isReservedTopLevelSlug,
  isValidSlug,
  pagedPath,
  parsePageSegment,
  searchResultsPath,
  specialismPath,
} from "../routes.ts";

test("paths are built in the agreed shape", () => {
  assert.equal(countryPath("spain"), "/spain");
  assert.equal(cityPath("spain", "madrid"), "/spain/madrid");
  assert.equal(
    citySpecialismPath("spain", "madrid", "information-technology"),
    "/spain/madrid/information-technology",
  );
  assert.equal(specialismPath("legal"), "/specialisms/legal");
  assert.equal(agencyPath("caroo-manchester"), "/agencies/caroo-manchester");
  assert.equal(searchResultsPath("IT recruiters in Madrid"), "/search?q=IT+recruiters+in+Madrid");
  assert.equal(searchResultsPath("R&D / science"), "/search?q=R%26D+%2F+science");
});

test("page 1 is the list's own address; later pages add /page/N", () => {
  assert.equal(pagedPath("/united-kingdom/london", 1), "/united-kingdom/london");
  assert.equal(pagedPath("/united-kingdom/london", 0), "/united-kingdom/london");
  assert.equal(pagedPath("/united-kingdom/london", 2), "/united-kingdom/london/page/2");
  assert.equal(pagedPath("/spain/madrid/legal", 3), "/spain/madrid/legal/page/3");
});

test("only clean page numbers from 2 upwards are accepted", () => {
  assert.equal(parsePageSegment("2"), 2);
  assert.equal(parsePageSegment("159"), 159);
  for (const bad of ["1", "0", "02", "2.0", "-2", "two", "", "2a", "1e3", "9999999"]) {
    assert.equal(parsePageSegment(bad), null, bad);
  }
});

test("slugs must be lowercase words joined by single hyphens", () => {
  for (const good of ["spain", "united-kingdom", "s-hertogenbosch", "4-tech"]) {
    assert.equal(isValidSlug(good), true, good);
  }
  for (const bad of ["", "Spain", "spain-", "-spain", "a--b", "a b", "a/b", "a.b", "x".repeat(121)]) {
    assert.equal(isValidSlug(bad), false, bad);
  }
});

test("reserved words can never be read as a country", () => {
  for (const word of ["search", "agencies", "countries", "specialisms", "for-agencies",
    "about", "contact", "legal", "api", "styleguide", "sitemap.xml", "sitemaps", "robots.txt",
    "llms.txt", "blog", "admin", "SEARCH"]) {
    assert.equal(isReservedTopLevelSlug(word), true, word);
  }
  assert.equal(isReservedTopLevelSlug("spain"), false);
});

test("every fixed top-level route in src/app is reserved", () => {
  const appDir = join(import.meta.dirname, "..", "..", "app");
  const entries = readdirSync(appDir, { withFileTypes: true });
  const routeFiles = new Map([["robots.ts", "robots.txt"]]);
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Dynamic segments ([country]) and route groups are not fixed words.
      if (/^[[(_@]/.test(entry.name)) continue;
      assert.equal(isReservedTopLevelSlug(entry.name), true, `src/app/${entry.name} is not reserved`);
    } else if (routeFiles.has(entry.name)) {
      assert.equal(isReservedTopLevelSlug(routeFiles.get(entry.name)!), true);
    }
  }
});
