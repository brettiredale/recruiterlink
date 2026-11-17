import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLinkedInUrl, parseVideoUrl, videoEmbedUrl } from "./validate.ts";

test("YouTube addresses become one stored form", () => {
  const stored = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  for (const input of [
    stored,
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    " youtube.com/watch?v=dQw4w9WgXcQ ".replace(" youtube", "https://youtube"),
  ]) {
    assert.equal(parseVideoUrl(input)?.url, stored, input);
  }
  assert.equal(parseVideoUrl("https://www.youtube.com/watch?v=short"), null);
  assert.equal(parseVideoUrl("https://www.youtube.com/@channel"), null);
});

test("Vimeo addresses become one stored form", () => {
  assert.equal(parseVideoUrl("https://vimeo.com/76979871")?.url, "https://vimeo.com/76979871");
  assert.equal(parseVideoUrl("https://player.vimeo.com/video/76979871")?.url, "https://vimeo.com/76979871");
  assert.equal(parseVideoUrl("https://vimeo.com/channels/staffpicks/76979871")?.url, "https://vimeo.com/76979871");
  assert.equal(parseVideoUrl("https://vimeo.com/about"), null);
});

test("other sites and bad input are refused", () => {
  assert.equal(parseVideoUrl("https://evil.example/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseVideoUrl("javascript:alert(1)"), null);
  assert.equal(parseVideoUrl("not a url"), null);
});

test("embeds use the privacy-friendly players", () => {
  assert.equal(
    videoEmbedUrl(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")!),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
  );
  assert.equal(videoEmbedUrl(parseVideoUrl("https://vimeo.com/76979871")!), "https://player.vimeo.com/video/76979871?dnt=1");
});

test("LinkedIn profile addresses", () => {
  assert.equal(parseLinkedInUrl("https://uk.linkedin.com/in/jane-doe/"), "https://www.linkedin.com/in/jane-doe");
  assert.equal(parseLinkedInUrl("linkedin.com/in/jane-doe"), "https://www.linkedin.com/in/jane-doe");
  assert.equal(parseLinkedInUrl("https://www.linkedin.com/company/acme"), null);
  assert.equal(parseLinkedInUrl("https://linkedin.com.evil.example/in/jane"), null);
});
