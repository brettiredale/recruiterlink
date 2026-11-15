import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bannedPhrasesIn,
  checkText,
  firstPersonWords,
  pickExtraPages,
  quoteInSource,
  normalise,
  verdictFor,
} from "./checks.ts";

test("finds the old template phrases", () => {
  assert.deepEqual(bannedPhrasesIn("Our Dedicated Team finds top-tier talent."), ["dedicated team", "top-tier"]);
  assert.deepEqual(bannedPhrasesIn("Acme fills accounting roles in Leeds."), []);
});

test("first-person words, but not the country US", () => {
  assert.deepEqual(firstPersonWords("We place nurses. Our clients"), ["we", "our"]);
  assert.deepEqual(firstPersonWords("Acme hires across the US and Canada."), []);
  assert.deepEqual(firstPersonWords("Contact us today."), ["us"]);
});

test("a quote matches through markdown, case and curly quotes", () => {
  const source = normalise("## About\nFounded in **1998**, Acme’s team places [IT contractors](/it) across the UK.");
  assert.equal(quoteInSource("Founded in 1998, Acme's team places IT contractors", source), true);
  assert.equal(quoteInSource("Founded in 2001", source), false);
  assert.equal(quoteInSource("UK", source), false, "too short to prove anything");
});

test("verdicts", () => {
  const base = {
    name: "Acme Recruitment",
    introduction: "Acme Recruitment places accountants in Leeds.",
    description: Array(100).fill("word").join(" "),
    source: "a b c d e f g h i j k l m n o p q r s t u v w x y z",
    facts: [
      { fact: "1", quote: "a b c d e" },
      { fact: "2", quote: "f g h i j" },
      { fact: "3", quote: "k l m n o" },
      { fact: "4", quote: "p q r s t" },
    ],
  };
  assert.equal(verdictFor("agency", checkText(base)).verdict, "ready");
  assert.equal(verdictFor("agency", checkText({ ...base, facts: base.facts.slice(0, 3) })).verdict, "thin");
  assert.equal(verdictFor("agency", checkText({ ...base, description: "short text" })).verdict, "thin");
  assert.equal(verdictFor("agency", checkText({ ...base, introduction: "We are a dedicated team." })).verdict, "thin");
  assert.equal(verdictFor("not_agency", checkText(base)).verdict, "not_agency");
  assert.equal(verdictFor("unusable", checkText(base)).verdict, "unusable");
});

test("picks about and services pages on the same site", () => {
  const picked = pickExtraPages(
    [
      "https://www.acme.co.uk/about-us/",
      "/services",
      "https://www.acme.co.uk/jobs/about-this-job",
      "https://other.com/about",
      "https://acme.co.uk/privacy",
      "https://acme.co.uk/blog/our-services-explained",
      "mailto:info@acme.co.uk",
    ],
    "https://acme.co.uk",
  );
  assert.deepEqual(picked, ["https://www.acme.co.uk/about-us", "https://acme.co.uk/services"]);
  assert.deepEqual(pickExtraPages(["https://nl.example/over-ons"], "https://nl.example"), ["https://nl.example/over-ons"]);
});
