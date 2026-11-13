import assert from "node:assert/strict";
import { test } from "node:test";
import { isFetchableAddress, isPrivateAddress, unwrapImageAddress } from "../../features/account/logo-address.ts";

test("unwraps Next.js and Vercel image addresses to the original file", () => {
  const page = "https://pactandpartners.com/about";
  assert.equal(
    unwrapImageAddress("/_next/image?url=%2Flogo-white.png&w=256&q=75", page)?.href,
    "https://pactandpartners.com/logo-white.png",
  );
  assert.equal(
    unwrapImageAddress("https://cdn.example.com/_vercel/image?url=https%3A%2F%2Fimg.example.com%2Fa.svg", page)?.href,
    "https://img.example.com/a.svg",
  );
  assert.equal(unwrapImageAddress("images/logo.png", page)?.href, "https://pactandpartners.com/images/logo.png");
  assert.equal(unwrapImageAddress("http://[bad", page), null);
});

test("private, local and reserved addresses are private", () => {
  for (const ip of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "172.20.0.1", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "172.32.0.1", "104.18.2.3", "2606:4700::1111"]) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test("only public web addresses on the usual ports can be fetched", () => {
  const ok = (address: string) => isFetchableAddress(new URL(address));
  assert.equal(ok("https://www.hays.com/logo.svg"), true);
  assert.equal(ok("http://8.8.8.8/logo.png"), true);
  assert.equal(ok("ftp://example.com/logo.png"), false);
  assert.equal(ok("https://user:pass@example.com/logo.png"), false);
  assert.equal(ok("https://example.com:8080/logo.png"), false);
  assert.equal(ok("http://localhost/logo.png"), false);
  assert.equal(ok("http://printer.local/logo.png"), false);
  assert.equal(ok("http://metadata.google.internal/"), false);
  assert.equal(ok("http://169.254.169.254/latest"), false);
  assert.equal(ok("http://[::1]/logo.png"), false);
  assert.equal(ok("http://intranet/logo.png"), false);
});
