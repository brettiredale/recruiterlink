import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MIN_AGENCIES_TO_INDEX,
  isCityIndexable,
  isCitySpecialismIndexable,
  isPagedListIndexable,
  robotsRule,
} from "../indexability.ts";

test("cities are indexable from three agencies", () => {
  assert.equal(MIN_AGENCIES_TO_INDEX, 3);
  assert.equal(isCityIndexable(0), false);
  assert.equal(isCityIndexable(2), false);
  assert.equal(isCityIndexable(3), true);
  assert.equal(isCityIndexable(3794), true);
});

test("city + specialism pages need an indexable city, three agencies and a real specialism", () => {
  const ok = { cityAgencyCount: 73, pairAgencyCount: 14, specialismSlug: "information-technology" };
  assert.equal(isCitySpecialismIndexable(ok), true);
  assert.equal(isCitySpecialismIndexable({ ...ok, pairAgencyCount: 3 }), true);
  assert.equal(isCitySpecialismIndexable({ ...ok, pairAgencyCount: 2 }), false);
  assert.equal(isCitySpecialismIndexable({ ...ok, cityAgencyCount: 2, pairAgencyCount: 2 }), false);
  assert.equal(isCitySpecialismIndexable({ ...ok, specialismSlug: "human-resources" }), false);
  assert.equal(isCitySpecialismIndexable({ ...ok, specialismSlug: "consulting-advisory" }), false);
});

test("only the first page of a list is indexable", () => {
  assert.equal(isPagedListIndexable(1, true), true);
  assert.equal(isPagedListIndexable(1, false), false);
  assert.equal(isPagedListIndexable(2, true), false);
});

test("before launch nothing is indexed or followed", () => {
  assert.deepEqual(robotsRule(true, false), { index: false, follow: false });
  assert.deepEqual(robotsRule(false, false), { index: false, follow: false });
});

test("after launch thin pages are noindex but their links are followed", () => {
  assert.deepEqual(robotsRule(true, true), { index: true, follow: true });
  assert.deepEqual(robotsRule(false, true), { index: false, follow: true });
});
