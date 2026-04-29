// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildCspHeader } from "./middleware";

// ──────────────────────────────────────────────
// Regression: Next.js dev mode requires 'unsafe-eval' for HMR/React Refresh.
// Without it, every client bundle is blocked, hydration fails, and forms
// silently revert to native HTML GET submission. See PDCA-2026-0007.
// ──────────────────────────────────────────────

describe("buildCspHeader", () => {
  it("includes 'unsafe-eval' in script-src when NODE_ENV is development", () => {
    const csp = buildCspHeader("development");
    const scriptSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).toContain("'unsafe-eval'");
  });

  it("includes 'unsafe-eval' in script-src when NODE_ENV is test (matches dev so headless browsers don't break)", () => {
    const csp = buildCspHeader("test");
    const scriptSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).toContain("'unsafe-eval'");
  });

  it("does NOT include 'unsafe-eval' in script-src when NODE_ENV is production", () => {
    const csp = buildCspHeader("production");
    const scriptSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("preserves required directives in production (Stripe, self, inline styles)", () => {
    const csp = buildCspHeader("production");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://js.stripe.com");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.supabase.co");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("treats undefined NODE_ENV as non-production (dev-equivalent)", () => {
    const csp = buildCspHeader(undefined);
    expect(csp).toContain("'unsafe-eval'");
  });

  // ──────────────────────────────────────────────
  // Strict equality on the production literal.
  // The exact-match check on "production" must NOT be loosened — uppercase,
  // partial, or empty values must all behave as non-production so dev-like
  // environments don't accidentally lock down HMR.
  // ──────────────────────────────────────────────

  it("treats uppercase 'PRODUCTION' as non-production (only exact match excludes 'unsafe-eval')", () => {
    const csp = buildCspHeader("PRODUCTION");
    expect(csp).toContain("'unsafe-eval'");
  });

  it("treats partial 'prod' as non-production", () => {
    const csp = buildCspHeader("prod");
    expect(csp).toContain("'unsafe-eval'");
  });

  it("treats empty string as non-production", () => {
    const csp = buildCspHeader("");
    expect(csp).toContain("'unsafe-eval'");
  });

  it("does not leak state between calls (development -> production sequence is clean)", () => {
    const dev = buildCspHeader("development");
    const prod = buildCspHeader("production");
    expect(dev).toContain("'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
  });

  // ──────────────────────────────────────────────
  // Regression: PDF preview iframe, OAuth avatar <img> tags, and <video>
  // tags from Supabase Storage / blob: previews must NOT be CSP-blocked.
  //
  // - frame-src: must include https://*.supabase.co (PDF iframe on /problem/[id]/solve)
  // - img-src:   must include Google + Twitter user-content hosts (OAuth avatars
  //              go through the Radix Avatar primitive which renders raw <img>
  //              and bypasses next/image's domain whitelist)
  // - media-src: must exist as an explicit directive AND include 'self' + blob:
  //              + Supabase Storage. Without it, the browser falls back to
  //              default-src 'self' and blocks both Storage-hosted videos and
  //              local upload preview blob: URLs.
  //
  // These assertions run for both production and non-production CSPs.
  // The only difference between the two is 'unsafe-eval' on script-src;
  // these new directives apply identically in both environments.
  // ──────────────────────────────────────────────

  describe.each([
    ["production", "production"],
    ["development", "development"],
  ])("CSP frame/img/media-src regression (%s)", (_label, nodeEnv) => {
    it("frame-src includes https://*.supabase.co (PDF iframe must load)", () => {
      const csp = buildCspHeader(nodeEnv);
      const frameSrc = csp
        .split(";")
        .map((d) => d.trim())
        .find((d) => d.startsWith("frame-src"));
      expect(frameSrc).toBeDefined();
      expect(frameSrc).toContain("https://*.supabase.co");
    });

    it("img-src includes OAuth avatar hosts (Google + Twitter user-content) AND Supabase/Stripe asset hosts AND data:/blob: schemes", () => {
      const csp = buildCspHeader(nodeEnv);
      const imgSrc = csp
        .split(";")
        .map((d) => d.trim())
        .find((d) => d.startsWith("img-src"));
      expect(imgSrc).toBeDefined();
      // OAuth avatar hosts (Radix Avatar primitive — bypasses next/image)
      expect(imgSrc).toContain("https://*.googleusercontent.com");
      expect(imgSrc).toContain("https://pbs.twimg.com");
      // Supabase Storage uploads + Stripe-hosted imagery
      expect(imgSrc).toContain("https://*.supabase.co");
      expect(imgSrc).toContain("https://*.stripe.com");
      // Inline + transient image schemes (e.g. preview blobs, data: URIs)
      expect(imgSrc).toContain("data:");
      expect(imgSrc).toContain("blob:");
    });

    it("media-src directive exists and allows self + blob: + Supabase Storage", () => {
      const csp = buildCspHeader(nodeEnv);
      const mediaSrc = csp
        .split(";")
        .map((d) => d.trim())
        .find((d) => d.startsWith("media-src"));
      expect(mediaSrc).toBeDefined();
      expect(mediaSrc).toContain("'self'");
      expect(mediaSrc).toContain("blob:");
      expect(mediaSrc).toContain("https://*.supabase.co");
    });
  });

  // ──────────────────────────────────────────────
  // Snapshot-style byte-equals check on the production CSP.
  // If any directive silently drifts (e.g. a domain is added/removed),
  // this test fails and forces reviewers to inspect the change.
  //
  // NOTE on directive ORDER: directives are kept in semantic order
  // (scripts → styles → assets → connect → frames → meta), NOT
  // alphabetical. CSP itself is order-insensitive, so a reorder does
  // not change runtime behavior — but it WILL fail this snapshot.
  // If you change ORDER (vs adding/removing values), update this
  // snapshot deliberately and call it out in your PR description.
  // Do NOT auto-rebaseline. The structural assertions above
  // (describe.each blocks) verify behavior independent of order.
  // ──────────────────────────────────────────────

  it("matches the expected production CSP byte-for-byte", () => {
    expect(buildCspHeader("production")).toBe(
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com https://*.googleusercontent.com https://pbs.twimg.com",
        "media-src 'self' blob: https://*.supabase.co",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://generativelanguage.googleapis.com",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.supabase.co",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
    );
  });
});
