import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emailDomain,
  parseCode,
  parseEmail,
  parseTokenHash,
  parseUuid,
  sniffImage,
  validateListingText,
  validateNewListing,
  websiteHost,
} from "./validate.ts";

test("emails are trimmed, lower-cased and checked", () => {
  assert.equal(parseEmail("  Ana@Ruiz-Talent.COM "), "ana@ruiz-talent.com");
  assert.equal(parseEmail("not an email"), null);
  assert.equal(parseEmail("a@b"), null);
  assert.equal(parseEmail("two@@example.com"), null);
  assert.equal(parseEmail(undefined), null);
  assert.equal(emailDomain("ana@mail.ruiz.co.uk"), "mail.ruiz.co.uk");
});

test("sign-in codes accept spaces and nothing but digits", () => {
  assert.equal(parseCode(" 123 456 "), "123456");
  assert.equal(parseCode("12345"), null);
  assert.equal(parseCode("12345a"), null);
  assert.equal(parseCode("12345678"), "12345678");
  assert.equal(parseCode("12345678901"), null);
});

test("link tokens and ids must have the expected shape", () => {
  assert.equal(parseTokenHash("a".repeat(56)), "a".repeat(56));
  assert.equal(parseTokenHash("short"), null);
  assert.equal(parseTokenHash("bad token with spaces and more text"), null);
  assert.equal(parseUuid("3F2504E0-4F89-11D3-9A0C-0305E82C3301"), "3f2504e0-4f89-11d3-9a0c-0305e82c3301");
  assert.equal(parseUuid("1 or 1=1"), null);
});

test("website hosts drop the scheme, www and path", () => {
  assert.equal(websiteHost("HTTP://www.Example.com/about?x=1"), "example.com");
  assert.equal(websiteHost("jobs.example.co.uk"), "jobs.example.co.uk");
  assert.equal(websiteHost("localhost"), null);
  assert.equal(websiteHost("exa mple.com"), null);
  assert.equal(websiteHost("javascript:alert(1)"), null);
});

const goodText = {
  introduction: "Specialist IT recruiters.",
  description: "x".repeat(120),
  specialisms: ["3", "7"],
};

test("listing words: limits are enforced with clear messages", () => {
  const ok = validateListingText(goodText);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value.specialismIds, [3, 7]);

  const short = validateListingText({ ...goodText, description: "Too short" });
  assert.equal(short.ok, false);
  assert.match(short.ok === false ? short.errors.description ?? "" : "", /at least 80/);

  const none = validateListingText({ ...goodText, specialisms: ["abc", "-1"] });
  assert.equal(none.ok === false && Boolean(none.errors.specialisms), true);

  const many = validateListingText({ ...goodText, specialisms: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] });
  assert.match(many.ok === false ? many.errors.specialisms ?? "" : "", /up to 8/);

  const longIntro = validateListingText({ ...goodText, introduction: "y".repeat(301) });
  assert.equal(longIntro.ok === false && Boolean(longIntro.errors.introduction), true);
});

test("listing words: duplicates collapse and control characters are removed", () => {
  const result = validateListingText({
    introduction: " Hello\u0007 ",
    description: `Line one\r\nLine two ${"z".repeat(90)}`,
    specialisms: ["4", "4"],
  });
  assert.equal(result.value.introduction, "Hello");
  assert.equal(result.value.description.includes("\r"), false);
  assert.deepEqual(result.value.specialismIds, [4]);
});

test("new listing: the website must be on the signed-in email's domain", () => {
  const base = { ...goodText, name: "Ruiz Talent", website: "https://www.ruiz-talent.com/", country: "5", city: "Madrid" };
  assert.equal(validateNewListing(base, "ruiz-talent.com").ok, true);

  const other = validateNewListing({ ...base, website: "other.com" }, "ruiz-talent.com");
  assert.match(other.ok === false ? other.errors.website ?? "" : "", /must be on ruiz-talent\.com/);

  const empty = validateNewListing(
    { name: "", website: "", country: "", city: "", introduction: "", description: "", specialisms: [] },
    "ruiz-talent.com",
  );
  assert.equal(empty.ok, false);
  assert.deepEqual(
    Object.keys(empty.ok === false ? empty.errors : {}).sort(),
    ["city", "country", "description", "name", "specialisms", "website"],
  );
});

test("images are recognised by their contents, not their names", () => {
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext, "png");
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext, "jpg");
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(sniffImage(webp)?.ext, "webp");
  // An SVG or a script renamed to .png is refused.
  assert.equal(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")), null);
  assert.equal(sniffImage(new Uint8Array([])), null);
});

test("new listing: a country with states needs one of its own states", () => {
  const choices = { 7: { label: "State", options: [{ id: 10, code: "FL", name: "Florida" }] } };
  const base = { ...goodText, name: "Ruiz Talent", website: "ruiz-talent.com", country: "7", city: "Miami" };

  const missing = validateNewListing(base, "ruiz-talent.com", choices);
  assert.equal(missing.ok === false ? missing.errors.region : "", "Choose the state.");

  const wrong = validateNewListing({ ...base, region: "99" }, "ruiz-talent.com", choices);
  assert.equal(wrong.ok, false);

  const good = validateNewListing({ ...base, region: "10" }, "ruiz-talent.com", choices);
  assert.equal(good.ok, true);
  assert.equal(good.value.regionId, 10);

  // A country with no states ignores a stray region value.
  const spain = validateNewListing({ ...base, country: "5", region: "10" }, "ruiz-talent.com", choices);
  assert.equal(spain.ok, true);
  assert.equal(spain.value.regionId, null);
});
