import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GENERIC_SPECIALISM_SLUGS,
  displaySpecialisms,
  genericLast,
  isGenericSpecialism,
  sentenceList,
  specialismAgenciesPhrase,
  specialismHeading,
  specialismInPlaceHeading,
  specialismLabel,
  withoutGeneric,
} from "../specialisms.ts";

const s = (name: string, slug: string) => ({ name, slug });
const it = s("Information Technology", "information-technology");
const hr = s("Human Resources", "human-resources");
const consulting = s("Consulting & Advisory", "consulting-advisory");
const legal = s("Legal", "legal");

test("the two over-tagged specialisms are the generic ones", () => {
  assert.deepEqual([...GENERIC_SPECIALISM_SLUGS].sort(), ["consulting-advisory", "human-resources"]);
  assert.equal(isGenericSpecialism("human-resources"), true);
  assert.equal(isGenericSpecialism("legal"), false);
});

test("generic specialisms go last, others keep their order", () => {
  assert.deepEqual(genericLast([hr, it, consulting, legal]), [it, legal, hr, consulting]);
  assert.deepEqual(withoutGeneric([hr, it, consulting, legal]), [it, legal]);
});

test("an agency's tags leave out generic specialisms unless it has nothing else", () => {
  assert.deepEqual(displaySpecialisms([hr, it, consulting]), [it]);
  assert.deepEqual(displaySpecialisms([hr, consulting]), [hr, consulting]);
  assert.deepEqual(displaySpecialisms([]), []);
});

test("labels read naturally mid-sentence", () => {
  assert.equal(specialismLabel(it), "IT");
  assert.equal(specialismLabel(hr), "HR");
  assert.equal(specialismLabel(s("Marketing & Communications", "marketing-communications")), "marketing and communications");
  assert.equal(specialismLabel(s("AI & Machine Learning", "ai-machine-learning")), "AI and machine learning");
  assert.equal(specialismLabel(s("Blockchain & Web3", "blockchain-web3")), "blockchain and Web3");
  assert.equal(specialismLabel(s("Aerospace, Aviation & Defence", "aerospace-aviation-defence")), "aerospace, aviation and defence");
  assert.equal(specialismLabel(s("Non-profit & Charity", "non-profit-charity")), "non-profit and charity");
  assert.equal(specialismLabel(s("Life Sciences & Pharmaceuticals", "life-sciences-pharmaceuticals")), "life sciences and pharmaceutical");
  assert.equal(specialismLabel(s("Executive Search", "executive-search")), "executive search");
});

test("headings are natural for each kind of specialism", () => {
  assert.equal(specialismAgenciesPhrase(it), "IT recruitment agencies");
  assert.equal(specialismHeading(legal), "Legal recruitment agencies");
  assert.equal(specialismHeading(s("Executive Search", "executive-search")), "Executive search firms");
  assert.equal(specialismInPlaceHeading(it, "Madrid"), "IT recruitment agencies in Madrid");
  assert.equal(
    specialismInPlaceHeading(s("Executive Search", "executive-search"), "London"),
    "Executive search firms in London",
  );
  assert.equal(
    specialismInPlaceHeading(s("Accounting & Finance", "accounting-finance"), "Sydney"),
    "Accounting and finance recruitment agencies in Sydney",
  );
  assert.equal(
    specialismInPlaceHeading(s("AI & Machine Learning", "ai-machine-learning"), "Paris"),
    "AI and machine learning recruitment agencies in Paris",
  );
});

test("sentence lists", () => {
  assert.equal(sentenceList([]), "");
  assert.equal(sentenceList(["a"]), "a");
  assert.equal(sentenceList(["a", "b"]), "a and b");
  assert.equal(sentenceList(["a", "b", "c"]), "a, b and c");
});
