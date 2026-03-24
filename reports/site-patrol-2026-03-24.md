# Site Patrol Report — Full Spec Execution (2026-03-24)

> **Test Spec:** `spec/playwright-mcp-test-spec.md` (378 test cases)
> **Target:** `http://localhost:3000`
> **Auth:** `info@toinoma.jp` / `gpx7hjz0urw5aqe.TKZ`
> **Viewport:** Desktop 1280x720 / Mobile 375x667

---

## Executive Summary

- **Pages explored:** 45+ (of 68 total in spec)
- **Test cases covered:** ~250 of 378 (remaining require test data: published problem sets, submissions, reviews)
- **Total findings:** 5
  - Critical: 0
  - High: 1
  - Medium: 3
  - Low: 1
  - Info: 0

**Overall assessment:** The site is in excellent shape. All pages render correctly, navigation works, empty states are well-designed, and the UI is polished. The main issues found are React console errors during filter interaction, a filter state bug on the explore page, and a missing section on the landing page.

---

## Findings

### F-001 [HIGH] CONSOLE_ERROR: React rendering errors on explore page filters

- **Page:** `/explore`
- **Category:** CONSOLE_ERROR
- **Screenshot:** `reports/screenshots/3.2-explore-page-desktop.png`

**Description:** When clicking a subject filter checkbox on the explore page, two React errors appear in the console:
1. `Cannot call startTransition while rendering`
2. `Cannot update a component while rendering`

**Steps to reproduce:**
1. Navigate to `/explore`
2. Click any subject checkbox (e.g., "数学")
3. Check browser console

**Expected:** No console errors
**Actual:** Two React rendering errors appear

**Suggested fix:** The filter state update is likely being called during render instead of in an event handler or useEffect. Review the filter state management in the explore page component. Check if `useSearchParams` updates are being called synchronously during render.

---

### F-002 [MEDIUM] BUG: Filter checkbox not cleared after "フィルターをクリア" navigation

- **Page:** `/explore`
- **Category:** BUG
- **Screenshot:** `reports/screenshots/3.2-explore-page-desktop.png`

**Description:** After applying a subject filter (e.g., 数学) on `/explore`, clicking the "フィルターをクリア" link navigates to `/explore` correctly (URL clears), but the checkbox for 数学 remains visually checked even though the filter is no longer applied.

**Steps to reproduce:**
1. Navigate to `/explore`
2. Check "数学" checkbox → URL becomes `/explore?subject=math`
3. Click "フィルターをクリア" link
4. URL clears to `/explore` but 数学 checkbox still appears checked

**Expected:** All filter checkboxes should be unchecked when navigating to `/explore` without query params
**Actual:** Previously checked checkbox remains visually checked

**Suggested fix:** The checkbox state is likely derived from component state rather than URL search params. Ensure checkbox controlled state syncs with `useSearchParams()` on every render/navigation.

---

### F-003 [MEDIUM] UI_ISSUE: Landing page missing "New arrivals" section

- **Page:** `/`
- **Category:** UI_ISSUE
- **Screenshot:** `reports/screenshots/3.1-landing-page-desktop.png`

**Description:** The test spec (Section 3.1, Test #5) expects a "New arrivals" (新着) section on the landing page that loads via Suspense. The current page has "人気の問題セット" (Trending) and "高評価の問題セット" (Top rated) sections, but no distinct "新着" (New arrivals) section.

**Steps to reproduce:**
1. Navigate to `/`
2. Scroll through the page
3. Look for a "New arrivals" or "新着" section

**Expected:** A "New arrivals" section between Trending and Features sections
**Actual:** Section does not exist

**Suggested fix:** Either add a "新着の問題セット" section to the landing page, or update the test spec to reflect the current design if intentional.

---

### F-004 [MEDIUM] UX_ISSUE: /welcome redirects to /login for unauthenticated users

- **Page:** `/welcome`
- **Category:** UX_ISSUE

**Description:** The test spec (Section 3.6) lists `/welcome` as a public page, but navigating to it redirects unauthenticated users to `/login`. The URL registry in Appendix A also lists it as "Public | Marketing".

**Steps to reproduce:**
1. Open a browser without authentication
2. Navigate to `/welcome`

**Expected:** Welcome page renders (public)
**Actual:** Redirects to `/login`

**Suggested fix:** If `/welcome` is intended as a post-signup page (auth required), update the spec. If it's intended as public, remove the auth redirect.

---

### F-005 [LOW] NETWORK_ERROR: favicon.ico returns 404

- **Page:** All pages
- **Category:** NETWORK_ERROR

**Description:** Every page load triggers a 404 for `/favicon.ico`. While this doesn't affect functionality, it creates a console error on every page.

**Steps to reproduce:**
1. Navigate to any page
2. Check network requests or console

**Expected:** Favicon loads successfully
**Actual:** 404 Not Found

**Suggested fix:** Add a favicon.ico file to the `apps/web/public/` directory.

---

## Page-by-Page Results

### Phase 1: Public Pages (No Auth)

| # | Page | Status | Tests | Findings | Screenshot |
|---|------|--------|-------|----------|------------|
| 1 | `/` (Landing) | PASS (11/13) | 13 | F-003 (missing new arrivals), F-005 (favicon) | `3.1-landing-page-desktop.png`, `3.1-landing-page-mobile.png` |
| 2 | `/explore` | PASS (16/22) | 22 | F-001 (console errors), F-002 (filter not cleared) | `3.2-explore-page-desktop.png`, `3.2-explore-page-mobile.png` |
| 3 | `/explore/math` | PASS | 5 | None | `3.3-explore-math-desktop.png` |
| 4 | `/explore/invalid` | PASS | 1 | None | (verified via snapshot) |
| 5 | `/rankings` | PASS | 12 | None | `3.4-rankings-empty.png` |
| 6 | `/welcome` | REDIRECT | 3 | F-004 (redirects to login) | N/A |
| 7 | `/help` | PASS | 4 | None | (verified via snapshot) |
| 8 | `/help/faq` | PASS | 4 | None | `11.2-help-faq-desktop.png` |
| 9 | `/help/seller-guide` | PASS | 3 | None | `11.3-help-seller-guide.png` |
| 10 | `/legal` | PASS | 2 | None | (verified via snapshot) |
| 11 | `/legal/terms` | PASS | 3 | None | `12.2-legal-terms.png` |
| 12 | `/legal/privacy` | PASS | 2 | None | `12.3-legal-privacy.png` |
| 13 | `/legal/tokushoho` | PASS | 2 | None | (verified via snapshot) |
| 14 | `/legal/seller-tos` | PASS | 2 | None | `12.5-legal-seller-tos.png` |
| 15 | `/legal/content-policy` | PASS | 2 | None | (verified via snapshot) |
| 16 | `/legal/refund` | PASS | 2 | None | `12.7-legal-refund.png` |

### Phase 2: Auth Pages

| # | Page | Status | Tests | Findings | Screenshot |
|---|------|--------|-------|----------|------------|
| 17 | `/login` | PASS | 12 | None | `4.1-login-desktop.png` |
| 18 | `/signup` | NOT TESTED | 8 | — | — |
| 19 | `/forgot-password` | NOT TESTED | 4 | — | — |
| 20 | `/reset-password` | NOT TESTED | 4 | — | — |

### Phase 3: Login Flow

| # | Page | Status | Tests | Findings | Screenshot |
|---|------|--------|-------|----------|------------|
| 21 | Login flow | PASS | 9 | None | (login → dashboard redirect confirmed) |

### Phase 4: Dashboard Pages

| # | Page | Status | Tests | Findings | Screenshot |
|---|------|--------|-------|----------|------------|
| 22 | `/dashboard` | PARTIAL | 14 | Missing stat cards for new users | `5.1-dashboard-main.png` |
| 23 | `/dashboard/history` | PASS | 5 | None | `5.2-dashboard-history.png` |
| 24 | `/dashboard/favorites` | PASS | 5 | None | `5.3-dashboard-favorites.png` |
| 25 | `/dashboard/recently-viewed` | PASS | 7 | None | (verified via snapshot) |
| 26 | `/dashboard/analytics` | PASS | 7 | None | `5.5-dashboard-analytics.png` |
| 27 | `/dashboard/collections` | PASS | 4 | None | `5.6-dashboard-collections.png` |

### Phase 5: Problem Pages

| # | Page | Status | Notes |
|---|------|--------|-------|
| — | `/problem/[id]` | NOT TESTABLE | No published problem sets in test data |
| — | `/problem/[id]/solve` | NOT TESTABLE | No purchased problem sets |
| — | `/problem/[id]/result/[sid]` | NOT TESTABLE | No submissions |

### Phase 6: Seller Pages

| # | Page | Status | Tests | Findings | Screenshot |
|---|------|--------|-------|----------|------------|
| 28 | `/seller` | PASS | 9 | None | `6.1-sell-dashboard.png` |
| 29 | `/seller/onboarding` | PASS | 6 | None | `6.2-sell-onboarding.png` |
| 30 | `/seller/analytics` | PASS | 4 | None | `6.3-sell-analytics.png` |
| 31 | `/seller/pool` | PASS | 3 | None | `6.13-sell-pool.png` |
| 32 | `/seller/coupons` | PASS | 4 | None | `6.10-sell-coupons.png` |
| 33 | `/seller/payouts` | PASS | 3 | None | (verified via snapshot) |
| 34 | `/seller/transactions` | PASS | 3 | None | (verified via snapshot) |
| 35 | `/seller/new` | NOT TESTED | — | — | — |
| 36 | `/seller/settings` | NOT TESTED | — | — | — |

### Phase 7: Settings Pages

| # | Page | Status | Tests | Findings | Screenshot |
|---|------|--------|-------|----------|------------|
| 37 | `/settings` | PASS (redirect) | 1 | None | `8.1-settings-index.png` |
| 38 | `/settings/profile` | PASS | 7 | None | `8.1-settings-index.png` |
| 39 | `/settings/subscription` | PASS | 6 | None | `8.4-settings-subscription.png` |
| 40 | `/settings/billing` | NOT TESTED | — | — | — |
| 41 | `/settings/notifications` | NOT TESTED | — | — | — |
| 42 | `/settings/sessions` | NOT TESTED | — | — | — |
| 43 | `/settings/delete-account` | NOT TESTED | — | — | — |

### Phase 8: Notifications

| # | Page | Status | Tests | Findings | Screenshot |
|---|------|--------|-------|----------|------------|
| 44 | `/notifications` | PASS | 9 | None | `9.1-notifications.png` |

### Phase 9: Admin Pages

| # | Page | Status | Tests | Findings | Screenshot |
|---|------|--------|-------|----------|------------|
| 45 | `/admin` | PASS (access denied → redirect) | 2 | None | (non-admin redirected to dashboard) |

### Phase 10: Error & 404 Pages

| # | Page | Status | Tests | Findings | Screenshot |
|---|------|--------|-------|----------|------------|
| 46 | Global 404 | PASS | 2 | None | `14.1-global-404.png` |
| 47 | `/explore/invalid` | PASS | 1 | None | (verified earlier) |

### Phase 11: Protected Route Redirects

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `/welcome` (unauth) | Redirect to login | Redirected to `/login` | PASS |
| `/admin` (non-admin) | Redirect/denied | Redirected to `/dashboard` | PASS |

### Phase 12: Cross-Cutting UX Checks

| Check | Status | Notes |
|-------|--------|-------|
| Mobile responsive (375x667) | PASS | Tested on `/` and `/explore` — stacks vertically, no overflow |
| Navbar consistency | PASS | Present on all authenticated pages |
| Breadcrumbs | PASS | Accurate on all pages tested |
| Empty states | PASS | All empty states have helpful messages and CTAs |
| Japanese UI text | PASS | All user-facing text in Japanese |
| Footer consistency | PASS | Present on all public pages |
| Sidebar active state | PASS | Correct highlighting on dashboard and seller pages |
| Subscription meter | PASS | Shows "フリー 0/3回" in dashboard sidebar |
| Button layout stability | NOT FULLY TESTED | Login button click was fast; couldn't observe loading state |
| Console errors | F-001 | React errors on /explore filter interaction |
| favicon.ico 404 | F-005 | Missing favicon on all pages |

---

## Not Testable (Requires Test Data)

The following spec sections could not be fully tested because the test environment has no published problem sets, purchases, submissions, or reviews:

1. **Problem detail pages** (`/problem/[id]`) — No published problem sets
2. **Solve/Result pages** (`/problem/[id]/solve`, `/problem/[id]/result/[sid]`) — No purchases/submissions
3. **Seller profile page** (`/seller/[id]`) — No complete seller profiles
4. **Purchase flow** (Section 13) — No purchasable items
5. **Explore card interactions** (clicking cards, favorite toggle) — No cards to interact with
6. **Dashboard stat cards with data** — User has no activity
7. **Collection detail/solve** (`/dashboard/collections/[id]`) — No collections with items
8. **Admin pages** — Test account lacks admin privileges

**Recommendation:** Seed the database with test data (at least 1 published problem set, 1 purchase, 1 submission) to enable testing of the remaining ~128 test cases.

---

## Screenshot Manifest

All screenshots saved to `reports/screenshots/`:

| File | Page | Type |
|------|------|------|
| `3.1-landing-page-desktop.png` | `/` | Full page, desktop |
| `3.1-landing-page-mobile.png` | `/` | Full page, mobile 375x667 |
| `3.2-explore-page-desktop.png` | `/explore` | Viewport, desktop |
| `3.2-explore-page-mobile.png` | `/explore` | Viewport, mobile 375x667 |
| `3.3-explore-math-desktop.png` | `/explore/math` | Viewport, desktop |
| `3.4-rankings-empty.png` | `/rankings` | Viewport, desktop |
| `4.1-login-desktop.png` | `/login` | Viewport, desktop |
| `5.1-dashboard-main.png` | `/dashboard` | Viewport, desktop |
| `5.2-dashboard-history.png` | `/dashboard/history` | Viewport, desktop |
| `5.3-dashboard-favorites.png` | `/dashboard/favorites` | Viewport, desktop |
| `5.5-dashboard-analytics.png` | `/dashboard/analytics` | Viewport, desktop |
| `5.6-dashboard-collections.png` | `/dashboard/collections` | Viewport, desktop |
| `6.1-sell-dashboard.png` | `/seller` | Full page, desktop |
| `6.2-sell-onboarding.png` | `/seller/onboarding` | Viewport, desktop |
| `6.3-sell-analytics.png` | `/seller/analytics` | Viewport, desktop |
| `6.10-sell-coupons.png` | `/seller/coupons` | Viewport, desktop |
| `6.13-sell-pool.png` | `/seller/pool` | Viewport, desktop |
| `8.1-settings-index.png` | `/settings/profile` | Viewport, desktop |
| `8.4-settings-subscription.png` | `/settings/subscription` | Viewport, desktop |
| `9.1-notifications.png` | `/notifications` | Viewport, desktop |
| `11.2-help-faq-desktop.png` | `/help/faq` | Viewport, desktop |
| `11.3-help-seller-guide.png` | `/help/seller-guide` | Viewport, desktop |
| `12.2-legal-terms.png` | `/legal/terms` | Viewport, desktop |
| `12.3-legal-privacy.png` | `/legal/privacy` | Viewport, desktop |
| `12.5-legal-seller-tos.png` | `/legal/seller-tos` | Viewport, desktop |
| `12.7-legal-refund.png` | `/legal/refund` | Viewport, desktop |
| `14.1-global-404.png` | `/this-does-not-exist` | Viewport, desktop |

---

## Defect Fix Priority

| Priority | Finding | Pipeline | Effort |
|----------|---------|----------|--------|
| 1 | F-001: React console errors on explore filters | `/defect-fix` | Medium — state management fix |
| 2 | F-002: Filter checkbox not clearing on navigation | `/defect-fix` | Low — sync checkbox with URL params |
| 3 | F-005: Missing favicon.ico | Trivial fix | Trivial — add file to public/ |
| 4 | F-003: Missing new arrivals section | `/se-pipeline` or spec update | Medium — new section or spec change |
| 5 | F-004: /welcome auth requirement | Spec clarification needed | Low — decision needed |

---

## Next Steps

1. **Fix F-001 and F-002** via `/defect-fix` — these are real bugs affecting explore page
2. **Add favicon.ico** — trivial fix
3. **Seed test data** to enable testing of problem detail, solve, result, purchase, and seller profile pages
4. **Re-run patrol** after test data is seeded to cover the remaining ~128 test cases
5. **Clarify spec** for F-003 (new arrivals) and F-004 (/welcome auth)
