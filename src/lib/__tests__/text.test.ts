import assert from "node:assert/strict";
import { test } from "node:test";
import { agencyCountLabel, firstSentence, stripTags, summarise, toParagraphs } from "../text.ts";

test("descriptions split into paragraphs on blank lines", () => {
  assert.deepEqual(toParagraphs("One.\n\nTwo\nstill two.\r\n\r\n  \n\nThree."), [
    "One.",
    "Two still two.",
    "Three.",
  ]);
  assert.deepEqual(toParagraphs(null), []);
  assert.deepEqual(toParagraphs("  "), []);
});

test("tags are removed, words kept", () => {
  assert.equal(stripTags("<p>Hello <b>there</b></p>"), "Hello there");
  assert.deepEqual(toParagraphs("<p>A</p>\n\n<script>x</script>"), ["A", "x"]);
});

test("summaries stay within the limit and end cleanly", () => {
  assert.equal(summarise("Short text.", 160), "Short text.");
  const long = "First sentence is here and is reasonably long. Second sentence follows it and runs on for a while longer than the limit allows.";
  assert.equal(summarise(long, 60), "First sentence is here and is reasonably long.");
  const noStop = "word ".repeat(60).trim();
  const cut = summarise(noStop, 50);
  assert.ok(cut.length <= 50, cut);
  assert.ok(cut.endsWith("…"));
  assert.equal(summarise(null), "");
});

test("first sentence", () => {
  assert.equal(firstSentence("Tech hiring for start-ups. More text."), "Tech hiring for start-ups.");
  assert.equal(firstSentence("No full stop"), "No full stop");
});

test("count labels", () => {
  assert.equal(agencyCountLabel(1), "1 agency");
  assert.equal(agencyCountLabel(3794), "3,794 agencies");
});
