import assert from "node:assert/strict";
import { test } from "node:test";
import { cityFaqs, citySpecialismFaqs, countryFaqs, homeFaqs } from "../faq.ts";

const specialisms = [
  { name: "Human Resources", slug: "human-resources", agencyCount: 60 },
  { name: "Executive Search", slug: "executive-search", agencyCount: 40 },
  { name: "Consulting & Advisory", slug: "consulting-advisory", agencyCount: 30 },
  { name: "Information Technology", slug: "information-technology", agencyCount: 14 },
  { name: "Marketing & Communications", slug: "marketing-communications", agencyCount: 10 },
];

test("city answers use real counts and never a generic specialism", () => {
  const faqs = cityFaqs({ city: "Madrid", country: "Spain", agencyCount: 73, rankInCountry: 1, specialisms });
  assert.equal(
    faqs[0].answer,
    "RecruiterLink lists 73 recruitment agencies based in Madrid, Spain. It is the largest city for recruitment agencies in our Spain directory.",
  );
  assert.equal(
    faqs[1].answer,
    "The most common specialisms among Madrid agencies are executive search (40), IT (14) and marketing and communications (10). The numbers are how many agencies list each one.",
  );
  const text = JSON.stringify(faqs);
  assert.ok(!/human resources|HR|consulting/i.test(text), text);
});

test("a one-agency city reads correctly and skips the specialism question", () => {
  const faqs = cityFaqs({ city: "Soria", country: "Spain", agencyCount: 1, rankInCountry: 30, specialisms: [specialisms[0]] });
  assert.equal(faqs.length, 2);
  assert.equal(faqs[0].answer, "RecruiterLink lists 1 recruitment agency based in Soria, Spain.");
});

test("country answers", () => {
  const faqs = countryFaqs({
    country: "Spain",
    agencyCount: 209,
    cityCount: 47,
    cities: [
      { name: "Madrid", agencyCount: 73 },
      { name: "Barcelona", agencyCount: 64 },
      { name: "Palma", agencyCount: 7 },
      { name: "Valencia", agencyCount: 4 },
    ],
    specialisms,
  });
  assert.equal(faqs[0].answer, "RecruiterLink lists 209 recruitment agencies in Spain, across 47 towns and cities.");
  assert.equal(
    faqs[1].answer,
    "Madrid (73), Barcelona (64) and Palma (7) have the most recruitment agencies in our Spain directory.",
  );
  assert.equal(faqs.length, 4);
});

test("a one-city country skips the cities question", () => {
  const faqs = countryFaqs({ country: "Singapore", agencyCount: 311, cityCount: 1, cities: [{ name: "Singapore", agencyCount: 311 }], specialisms });
  assert.equal(faqs[0].answer, "RecruiterLink lists 311 recruitment agencies in Singapore.");
  assert.ok(!faqs.some((faq) => faq.question.startsWith("Which cities")));
});

test("city + specialism answers", () => {
  const faqs = citySpecialismFaqs({
    city: "Madrid",
    country: "Spain",
    specialism: { name: "Information Technology", slug: "information-technology" },
    pairAgencyCount: 14,
    cityAgencyCount: 73,
  });
  assert.equal(faqs[0].question, "How many IT recruitment agencies are there in Madrid?");
  assert.equal(
    faqs[0].answer,
    "RecruiterLink lists 14 agencies in Madrid, Spain, that give IT as a specialism, out of 73 agencies in the city.",
  );
});

test("home answers quote the live totals and the agreed prices", () => {
  const faqs = homeFaqs({ agencyCount: 25497, countryCount: 31 });
  assert.match(faqs[0].answer, /25,497 agencies in 31 countries/);
  assert.match(faqs[3].answer, /\$49 USD a month or \$490 USD a year/);
});
