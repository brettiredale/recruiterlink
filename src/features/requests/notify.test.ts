import assert from "node:assert/strict";
import { test } from "node:test";
import { buildConfirmationEmail, buildNotificationEmail, NOTIFICATION_RECIPIENTS } from "./notify.ts";
import { renderEmail } from "./email-template.ts";

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

test("nothing a visitor types can become markup in the designed email", () => {
  const { html } = buildNotificationEmail({
    kind: "claim",
    name: '<script>alert(1)</script>',
    email: "a@example.com",
    agencyName: '"><img src=x onerror=alert(1)>',
    website: "javascript:alert(1)",
    message: "<b>bold</b> & more",
  });
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes("&lt;b&gt;bold&lt;/b&gt; &amp; more"));
});

test("the designed email is branded and has a plain-text twin", () => {
  const { html, text } = buildNotificationEmail({ kind: "contact", name: "Sam Lee", email: "sam@example.com", message: "Hello there" });
  assert.ok(html.includes("Recruiter<span") && html.includes("#EE1E80"));
  assert.ok(html.includes("#21174B"));
  assert.ok(!/<img\b/i.test(html), "no images: better for deliverability");
  assert.ok(text.includes("Sam Lee") && text.includes("Hello there"));
});

test("the sender gets a confirmation that names them and promises nothing false", () => {
  const { subject, html, text } = buildConfirmationEmail({ kind: "claim", name: "Ana Ruiz", email: "ana@example.com", agencyName: "Ruiz Talent" });
  assert.equal(subject, "We have received your request");
  assert.ok(text.includes("Thanks, Ana.") && text.includes("Ruiz Talent"));
  assert.ok(html.includes("https://recruiterlink.com/"));
});

test("only web and mail addresses become links", () => {
  const { html } = renderEmail({ preheader: "p", heading: "h", rows: [{ label: "Site", value: "x", href: "data:text/html,hi" }], button: { label: "Go", href: "javascript:void(0)" } });
  assert.ok(!html.includes("data:text/html"));
  assert.ok(!html.includes("javascript:"));
});
