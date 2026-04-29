import { test, expect } from "@playwright/test";

// PDCA-2026-0004: Browser-runtime hydration verification fixture for DRW Stage D3.
//
// This spec is invoked conditionally by DRW D3 step 4a when the fix manifest touches the
// page-load boundary (middleware, next.config, CSP/security headers, layout.tsx Script tags).
//
// What it asserts:
//   1. The dev server returns a 200 for an interactive page (/login).
//   2. The browser console reports zero CSP violations during page load.
//   3. React hydrates the client tree (a `<form>` with `data-hydrated="true"` set by an
//      `useEffect` in the login form acts as the sentinel; if missing, the page is server-only HTML).
//   4. Form inputs carry `name=` attributes (regression guard for the silent-reset class).
//
// If this spec fails, the D3 fix is incomplete — node/jsdom tests passed but the browser
// cannot execute the bundle. Common causes: CSP missing 'unsafe-eval' in dev, middleware
// redirect loop, response header blocking script execution, or hydration mismatch.

test("dev-mode hydration sentinel: /login page hydrates without CSP violations", async ({ page }) => {
  const cspViolations: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("Content Security Policy") || text.includes("Refused to")) {
      cspViolations.push(text);
    }
  });

  const response = await page.goto("/login");
  expect(response?.status(), "dev server returns 200 for /login").toBe(200);

  // Wait for the hydration sentinel. If React never hydrates, this times out.
  await page.waitForSelector('[data-hydrated="true"]', { timeout: 10_000 });

  expect(cspViolations, "no CSP violations during /login load").toEqual([]);

  // Regression guard: every form input must have a name attribute (silent-reset prevention).
  const inputs = await page.locator("form input").all();
  for (const input of inputs) {
    const name = await input.getAttribute("name");
    const type = await input.getAttribute("type");
    if (type === "submit" || type === "button") continue;
    expect(name, "form input must have a name attribute").toBeTruthy();
  }
});
