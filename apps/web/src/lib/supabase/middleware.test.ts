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
    expect(csp).toContain("frame-src 'self' https://js.stripe.com https://hooks.stripe.com");
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
  // Snapshot-style byte-equals check on the production CSP.
  // If any directive silently drifts (e.g. a domain is added/removed),
  // this test fails and forces reviewers to inspect the change.
  // ──────────────────────────────────────────────

  it("matches the expected production CSP byte-for-byte", () => {
    expect(buildCspHeader("production")).toBe(
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://generativelanguage.googleapis.com",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
    );
  });
});
