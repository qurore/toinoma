import { test, expect } from "@playwright/test";

// PDCA-2026-0004 + DRW PDCA-2026-0007 Bar Raiser fix-out:
// Browser-runtime hydration verification fixture for DRW Stage D3.
//
// This spec is invoked conditionally by DRW D3 step 4a when the fix manifest touches the
// page-load boundary (middleware, next.config, CSP/security headers, layout.tsx Script tags).
//
// Coverage scope:
//   PUBLIC auth routes only — `/login`, `/signup`, `/forgot-password`, `/reset-password`.
//   Each route has a `data-hydrated="true"` sentinel set by a `useEffect` in its page
//   component, so a missing sentinel proves React never hydrated and the bundle was blocked.
//
// What is asserted per route:
//   1. The dev server returns a 200.
//   2. The browser console reports zero CSP violations during page load.
//   3. React hydrates the client tree (the sentinel attribute is present).
//   4. Every form input that is not a submit/button carries a `name=` attribute
//      (regression guard for the silent-reset / native-GET class of bug).
//
// Plus a non-browser HTTP test that asserts the response `Content-Security-Policy`
// header literally contains the directives recovered in the prior fix
// (PDCA-2026-0007: PDF iframe, OAuth avatars, media-src).
//
// EXPLICITLY OUT OF SCOPE for this spec:
//   - Authenticated-only routes (`/dashboard`, `/problem/[id]/solve`,
//     `/dashboard/collections/[id]/solve`). Verifying the iframe and OAuth-avatar
//     CSP entries against rendered DOM there would require a Supabase test-user
//     fixture — heavy infra not currently provisioned. Static CSP coverage of
//     those use cases is provided by the response-header test below plus the
//     unit-test `describe.each` block in `src/lib/supabase/middleware.test.ts`.
//   - TODO(future): once a Supabase auth fixture exists, add a parallel spec that
//     loads `/problem/[id]/solve` and asserts the PDF `<iframe>` mounts without
//     CSP `frame-src` violations, and that an OAuth-avatar `<img>` resolves.
//
// If this spec fails, the D3 fix is incomplete — node/jsdom tests passed but the browser
// cannot execute the bundle. Common causes: CSP missing 'unsafe-eval' in dev, middleware
// redirect loop, response header blocking script execution, or hydration mismatch.

const PUBLIC_AUTH_ROUTES = [
  { path: "/login", label: "login" },
  { path: "/signup", label: "signup" },
  { path: "/forgot-password", label: "forgot-password" },
  { path: "/reset-password", label: "reset-password" },
] as const;

test.describe("dev-mode hydration sentinel (public auth routes)", () => {
  for (const { path, label } of PUBLIC_AUTH_ROUTES) {
    test(`${label}: page hydrates without CSP violations`, async ({ page }) => {
      const cspViolations: string[] = [];
      page.on("console", (msg) => {
        const text = msg.text();
        if (text.includes("Content Security Policy") || text.includes("Refused to")) {
          cspViolations.push(text);
        }
      });

      const response = await page.goto(path);
      expect(response?.status(), `dev server returns 200 for ${path}`).toBe(200);

      // Wait for the hydration sentinel. If React never hydrates, this times out.
      await page.waitForSelector('[data-hydrated="true"]', { timeout: 10_000 });

      expect(cspViolations, `no CSP violations during ${path} load`).toEqual([]);

      // Regression guard: every form input must have a name attribute (silent-reset prevention).
      const inputs = await page.locator("form input").all();
      for (const input of inputs) {
        const type = await input.getAttribute("type");
        if (type === "submit" || type === "button") continue;
        const name = await input.getAttribute("name");
        expect(name, `form input on ${path} must have a name attribute`).toBeTruthy();
      }
    });
  }
});

test.describe("CSP response header (regression for PDCA-2026-0007)", () => {
  test("Content-Security-Policy header carries the directives recovered after PDCA-2026-0007", async ({
    request,
  }) => {
    // Hit a public, hydration-safe route to read the middleware-emitted CSP.
    const response = await request.get("/login", { maxRedirects: 0 });
    expect(response.status(), "dev server returns 200 for /login").toBe(200);

    const csp = response.headers()["content-security-policy"];
    expect(csp, "Content-Security-Policy header is present").toBeTruthy();

    // Find each directive by prefix, independent of order, so this test is
    // resilient to a future re-ordering and only fails on semantic regressions.
    const directives = (csp ?? "").split(";").map((d) => d.trim());
    const get = (prefix: string) =>
      directives.find((d) => d.startsWith(`${prefix} `) || d === prefix);

    const frameSrc = get("frame-src");
    expect(frameSrc, "frame-src directive exists").toBeTruthy();
    expect(frameSrc).toContain("https://*.supabase.co");

    const imgSrc = get("img-src");
    expect(imgSrc, "img-src directive exists").toBeTruthy();
    expect(imgSrc).toContain("https://*.googleusercontent.com");
    expect(imgSrc).toContain("https://pbs.twimg.com");
    expect(imgSrc).toContain("https://*.supabase.co");
    expect(imgSrc).toContain("https://*.stripe.com");

    const mediaSrc = get("media-src");
    expect(mediaSrc, "media-src directive exists").toBeTruthy();
    expect(mediaSrc).toContain("'self'");
    expect(mediaSrc).toContain("blob:");
    expect(mediaSrc).toContain("https://*.supabase.co");
  });
});
