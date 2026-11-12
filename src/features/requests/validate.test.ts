import assert from "node:assert/strict";
import { test } from "node:test";
import { HONEYPOT_FIELD, LIMITS, validateRequest } from "./validate.ts";

const good = {
  kind: "claim",
  name: "  Ana   García ",
  email: " Ana@Example.COM ",
  agencyName: "Talento Madrid",
  website: "www.talento.example",
  message: "",
};

test("a good request is tidied and accepted", () => {
  assert.deepEqual(validateRequest(good), {
    ok: true,
    value: {
      kind: "claim",
      name: "Ana García",
      email: "ana@example.com",
      agencyName: "Talento Madrid",
      website: "www.talento.example",
      message: null,
    },
  });
});

test("a filled honeypot marks a bot, whatever else is sent", () => {
  assert.deepEqual(validateRequest({ ...good, [HONEYPOT_FIELD]: "555 1234" }), { ok: "bot" });
});

test("missing and malformed fields are reported", () => {
  const result = validateRequest({ kind: "nonsense", name: "A", email: "not-an-email", website: "not a site" });
  assert.equal(result.ok, false);
  if (result.ok !== false) return;
  assert.deepEqual(Object.keys(result.errors).sort(), ["agencyName", "email", "kind", "name", "website"]);
});

test("length limits are enforced", () => {
  const result = validateRequest({
    ...good,
    name: "n".repeat(LIMITS.name + 1),
    agencyName: "a".repeat(LIMITS.agencyName + 1),
    message: "m".repeat(LIMITS.message + 1),
    email: `${"e".repeat(250)}@example.com`,
    website: `www.${"w".repeat(300)}.com`,
  });
  assert.equal(result.ok, false);
  if (result.ok !== false) return;
  assert.deepEqual(Object.keys(result.errors).sort(), ["agencyName", "email", "message", "name", "website"]);
});

test("a contact message needs a message but no agency", () => {
  const empty = validateRequest({ kind: "contact", name: "Ana", email: "ana@example.com" });
  assert.equal(empty.ok, false);
  if (empty.ok === false) assert.deepEqual(Object.keys(empty.errors), ["message"]);
  const sent = validateRequest({ kind: "contact", name: "Ana", email: "ana@example.com", message: "Hello\r\nthere" });
  assert.equal(sent.ok, true);
  if (sent.ok === true) assert.equal(sent.value.message, "Hello\nthere");
});

test("non-text values and control characters are harmless", () => {
  const result = validateRequest({ ...good, name: ["x"], message: "ok\u0000\u0007" });
  assert.equal(result.ok, false);
  const clean = validateRequest({ ...good, message: "ok\u0000\u0007" });
  assert.equal(clean.ok === true && clean.value.message, "ok");
});
