/**
 * Questions and answers for directory pages, written from real counts
 * only. Pure functions, unit tested. Generic specialisms never appear in
 * an answer.
 */
import {
  sentenceList,
  specialismAgenciesPhrase,
  specialismLabel,
  withoutGeneric,
} from "./specialisms.ts";
import { agencyCountLabel, recruitmentAgencyCountLabel } from "./text.ts";

export type Faq = { question: string; answer: string };

type Counted = { name: string; slug: string; agencyCount: number };

function topSpecialisms(specialisms: readonly Counted[], limit = 4): string[] {
  return withoutGeneric(specialisms)
    .slice(0, limit)
    .map((item) => `${specialismLabel(item)} (${item.agencyCount.toLocaleString("en")})`);
}

function isAre(count: number): string {
  return count === 1 ? "is" : "are";
}

/** The home page's questions. */
export function homeFaqs(totals: { agencyCount: number; countryCount: number }): Faq[] {
  return [
    {
      question: "What is RecruiterLink?",
      answer: `RecruiterLink is a global directory of recruitment agencies. It lists ${agencyCountLabel(totals.agencyCount)} in ${totals.countryCount} countries. Search by city, country or specialism to find agencies that recruit for the roles you care about.`,
    },
    {
      question: "How do I find a recruitment agency near me?",
      answer:
        "Type what you need into the search box, such as the kind of role and the city. You can also browse by country, then by city, and narrow a city's agencies down by specialism.",
    },
    {
      question: "Can job seekers use RecruiterLink?",
      answer:
        "Yes. Search for agencies that recruit in your field and your location, then open an agency's profile to find its website and get in touch with it.",
    },
    {
      question: "How much does it cost to list a recruitment agency?",
      answer:
        "A standard listing is free. A Premium listing costs $49 USD a month or $499 USD a year, and adds images, video, team and leadership profiles and customer testimonials.",
    },
  ];
}

/** A country page's questions. `cities` and `specialisms` are largest first. */
export function countryFaqs(input: {
  country: string;
  agencyCount: number;
  cityCount: number;
  cities: readonly { name: string; agencyCount: number }[];
  specialisms: readonly Counted[];
}): Faq[] {
  const { country, agencyCount, cityCount } = input;
  const faqs: Faq[] = [
    {
      question: `How many recruitment agencies are there in ${country}?`,
      answer:
        cityCount > 1
          ? `RecruiterLink lists ${recruitmentAgencyCountLabel(agencyCount)} in ${country}, across ${cityCount.toLocaleString("en")} towns and cities.`
          : `RecruiterLink lists ${recruitmentAgencyCountLabel(agencyCount)} in ${country}.`,
    },
  ];
  const topCities = input.cities.slice(0, 3);
  if (topCities.length >= 2) {
    faqs.push({
      question: `Which cities in ${country} have the most recruitment agencies?`,
      answer: `${sentenceList(
        topCities.map((city) => `${city.name} (${city.agencyCount.toLocaleString("en")})`),
      )} have the most recruitment agencies in our ${country} directory.`,
    });
  }
  const top = topSpecialisms(input.specialisms);
  if (top.length >= 2) {
    faqs.push({
      question: `What do recruitment agencies in ${country} specialise in?`,
      answer: `The most common specialisms among the agencies we list in ${country} are ${sentenceList(top)}. The numbers are how many agencies list each one.`,
    });
  }
  faqs.push({
    question: `How do I find a recruitment agency in ${country}?`,
    answer: `Choose a city on this page to see every agency we list there, then use the specialism filter to narrow the list to your sector. You can also describe what you need in the search box.`,
  });
  return faqs;
}

/** A city page's questions. `specialisms` is largest first. */
export function cityFaqs(input: {
  city: string;
  country: string;
  agencyCount: number;
  /** 1 when the city has the most agencies in its country. */
  rankInCountry: number | null;
  specialisms: readonly Counted[];
}): Faq[] {
  const { city, country, agencyCount } = input;
  const faqs: Faq[] = [
    {
      question: `How many recruitment agencies are there in ${city}?`,
      answer: `RecruiterLink lists ${recruitmentAgencyCountLabel(agencyCount)} based in ${city}, ${country}.${
        input.rankInCountry === 1 && agencyCount > 1
          ? ` It is the largest city for recruitment agencies in our ${country} directory.`
          : ""
      }`,
    },
  ];
  const top = topSpecialisms(input.specialisms);
  if (top.length >= 2) {
    faqs.push({
      question: `What do recruitment agencies in ${city} specialise in?`,
      answer: `The most common specialisms among ${city} agencies are ${sentenceList(top)}. The numbers are how many agencies list each one.`,
    });
  }
  faqs.push({
    question: `How do I choose a recruitment agency in ${city}?`,
    answer:
      agencyCount > 1
        ? "Start with the specialism filter to find agencies that recruit for your sector, then open their profiles to compare what they do and visit their websites to get in touch."
        : "Open the agency's profile to read what it does and visit its website to get in touch. You can also look at nearby cities listed on this page.",
  });
  return faqs;
}

/** A city + specialism page's questions. */
export function citySpecialismFaqs(input: {
  city: string;
  country: string;
  specialism: { name: string; slug: string };
  pairAgencyCount: number;
  cityAgencyCount: number;
}): Faq[] {
  const { city, country, specialism, pairAgencyCount, cityAgencyCount } = input;
  const phrase = specialismAgenciesPhrase(specialism);
  const label = specialismLabel(specialism);
  return [
    {
      question: `How many ${phrase} are there in ${city}?`,
      answer: `RecruiterLink lists ${agencyCountLabel(pairAgencyCount)} in ${city}, ${country}, that ${pairAgencyCount === 1 ? "gives" : "give"} ${label} as a specialism, out of ${agencyCountLabel(cityAgencyCount)} in the city.`,
    },
    {
      question: `How do I choose between ${phrase} in ${city}?`,
      answer: `Open each agency's profile to read what it does and which other sectors it covers, then visit its website to get in touch. There ${isAre(cityAgencyCount)} ${agencyCountLabel(cityAgencyCount)} in ${city} in total if you want to look more widely.`,
    },
  ];
}
