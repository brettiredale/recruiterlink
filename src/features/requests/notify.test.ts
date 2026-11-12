import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNotificationEmail, NOTIFICATION_RECIPIENTS } from "./notify.ts";

test("notifications go to both of the owner's addresses", () => {
  assert.deepEqual([...NOTIFICATION_RECIPIENTS], ["brett@recruiterlink.com", "brettiredale@gmail.com"]);
});

test("the email carries every detail the sender gave", () => {
  const { subject, text } = buildNotificationEmail({
    kind: "claim",
    name: "Ana Ruiz",
    email: "ana@example.com",
    agencyName: "Ruiz Talent",
    website: "https://ruiztalent.example",
    message: "Please let me claim our page.\nThanks",
    sourcePath: "/for-agencies",
  });
  assert.match(subject, /Ruiz Talent/);
  for (const part of ["Ana Ruiz", "ana@example.com", "Ruiz Talent", "https://ruiztalent.example", "/for-agencies", "Please let me claim our page.\nThanks"]) {
    assert.ok(text.includes(part), `missing: ${part}`);
  }
});

test("line breaks in single-line fields cannot add lines to the email", () => {
  const { subject, text } = buildNotificationEmail({
    kind: "contact",
    name: "Eve\nBcc: someone@example.com",
    email: "eve@example.com",
    message: "Hello",
  });
  assert.ok(!subject.includes("\n"));
  assert.ok(text.includes("Name: Eve Bcc: someone@example.com"));
});

test("optional details are left out when empty", () => {
  const { text } = buildNotificationEmail({ kind: "contact", name: "Sam", email: "sam@example.com", agencyName: "", website: null, message: "" });
  assert.ok(!text.includes("Agency:"));
  assert.ok(!text.includes("Website:"));
  assert.ok(!text.includes("Message:"));
});
