# Playwright MCP Browser Test Specification

> **Document version:** 1.0
> **Created:** 2026-03-23
> **Target:** Toinoma (toinoma.jp) — full-site UI/UX validation
> **Auth credentials:** Email `info@toinoma.jp` / PW `gpx7hjz0urw5aqe.TKZ`

---

## Table of Contents

1. [Test Prerequisites](#1-test-prerequisites)
2. [Authentication Flow](#2-authentication-flow)
3. [Public Pages (No Auth)](#3-public-pages-no-auth)
4. [Auth Pages](#4-auth-pages)
5. [Dashboard Pages (Auth Required)](#5-dashboard-pages-auth-required)
6. [Seller Pages (Auth + Seller Profile Required)](#6-seller-pages-auth--seller-profile-required)
7. [Problem Pages](#7-problem-pages)
8. [Settings Pages (Auth Required)](#8-settings-pages-auth-required)
9. [Notifications (Auth Required)](#9-notifications-auth-required)
10. [Admin Pages (Auth + Admin Required)](#10-admin-pages-auth--admin-required)
11. [Help Pages (Public)](#11-help-pages-public)
12. [Legal Pages (Public)](#12-legal-pages-public)
13. [Purchase Flow](#13-purchase-flow)
14. [Error & Not-Found Pages](#14-error--not-found-pages)
15. [Cross-Cutting UX Checks](#15-cross-cutting-ux-checks)

---

## 1. Test Prerequisites

### 1.1 Environment Setup

| Item | Value |
|------|-------|
| Base URL | `http://localhost:3000` (dev) or `https://toinoma.jp` (prod) |
| Browser | Chromium (Playwright default) |
| Viewport | Desktop: 1280x720, Mobile: 375x667 |
| Locale | `ja-JP` |

### 1.2 Test Data Requirements

- At least 1 published problem set (to test `/problem/[id]`, `/explore`, etc.)
- At least 1 purchased problem set (to test `/problem/[id]/solve`)
- At least 1 completed submission (to test `/problem/[id]/result/[sid]`)
- At least 1 collection with items (to test `/dashboard/collections/[id]`)
- Seller onboarding completed for test account (to test `/sell/*`)
- At least 1 notification (to test `/notifications`)

### 1.3 Dynamic ID Discovery

Before running dynamic-route tests, query the app to discover valid IDs:
- `PROBLEM_SET_ID`: Navigate to `/explore`, capture first problem set link href
- `SELLER_ID`: From problem detail page, capture seller profile link href
- `SUBMISSION_ID`: Navigate to `/dashboard/history`, capture first result link href
- `COLLECTION_ID`: Navigate to `/dashboard/collections`, capture first collection link href

---

## 2. Authentication Flow

### 2.1 Login via Email/Password

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | Login page loads, two-column layout (desktop) or single-column (mobile) |
| 2 | Verify page elements | h2 "ログイン" visible, email input present, password input present |
| 3 | Verify OAuth buttons | "Googleでログイン" button visible, "X (Twitter) でログイン" button visible |
| 4 | Verify helper links | "パスワードをお忘れですか？" link points to `/forgot-password`, "新規登録" link points to `/signup` |
| 5 | Enter email `info@toinoma.jp` | Email field populated |
| 6 | Enter password `gpx7hjz0urw5aqe.TKZ` | Password field populated (masked) |
| 7 | Click "ログイン" button | Button shows spinner (icon swap, text unchanged), no width change |
| 8 | Wait for redirect | Redirected to `/dashboard` |
| 9 | Verify auth state | AppNavbar shows user avatar/name, not "ログイン" link |

### 2.2 Auth Persistence Check

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | After login, navigate to `/settings/profile` | Page loads without redirect to `/login` |
| 2 | Navigate to `/sell` | Page loads without redirect to `/login` |
| 3 | Refresh the page | Session persists, still authenticated |

### 2.3 Protected Route Redirect (Unauthenticated)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In a fresh browser context (no cookies), navigate to `/dashboard` | Redirected to `/login?next=/dashboard` |
| 2 | Navigate to `/sell` | Redirected to `/login?next=/sell` |
| 3 | Navigate to `/settings/profile` | Redirected to `/login?next=/settings/profile` |
| 4 | Navigate to `/admin` | Redirected to `/login?next=/admin` |
| 5 | Navigate to `/notifications` | Redirected to `/login?next=/notifications` |

---

## 3. Public Pages (No Auth)

### 3.1 Landing Page — `/`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/` | Page renders without errors, LCP < 2.5s |
| 2 | Navbar | Inspect top navigation | Navbar visible with logo, navigation links, login/signup buttons |
| 3 | Hero section | Scroll to hero | Headline visible, CTA button present and clickable |
| 4 | Trending section | Wait for Suspense | Skeleton grid (4 columns) appears then resolves to problem set cards |
| 5 | New arrivals | Scroll down | New arrival cards load via Suspense |
| 6 | Value section | Scroll down | Value proposition cards visible |
| 7 | How it works | Scroll down | Step-by-step section visible |
| 8 | Top rated | Wait for Suspense | Top-rated problem set cards load |
| 9 | Subjects section | Scroll down | Subject category grid visible, each links to `/explore/[subject]` |
| 10 | CTA section | Scroll to bottom | Bottom CTA section visible with action button |
| 11 | Footer | Scroll to bottom | Footer renders with links, copyright |
| 12 | Mobile layout | Set viewport 375x667 | All sections stack vertically, no horizontal overflow |
| 13 | Card interaction | Click any problem set card | Navigates to `/problem/[id]` |

### 3.2 Explore Page — `/explore`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/explore` | h1 visible (default text or search-result text), result grid renders |
| 2 | Filter sidebar (desktop) | Inspect left sidebar | Subject checkboxes, difficulty checkboxes, price range inputs, free-only toggle, min rating selector |
| 3 | Subject filter | Check "数学" checkbox | URL updates to `?subject=math`, results filtered, result count updates |
| 4 | Multi-subject filter | Also check "英語" | URL shows `?subject=math,english`, results include both subjects |
| 5 | Difficulty filter | Check "標準" | URL adds `?difficulty=standard`, results filtered accordingly |
| 6 | Free-only toggle | Toggle on | URL adds `?free=true`, only ¥0 items shown |
| 7 | Price range | Set min=500, max=2000 | URL adds `?price_min=500&price_max=2000`, results filtered |
| 8 | Min rating | Select 4 stars | URL adds `?min_rating=4`, only 4+ rated items shown |
| 9 | Sort dropdown | Select "新着順" | URL adds `?sort=newest`, results reorder |
| 10 | Sort - popular | Select "人気順" | Results reorder by purchase count |
| 11 | Sort - highest rated | Select "高評価順" | Results reorder by rating |
| 12 | Sort - price asc | Select "価格が安い順" | Results reorder by price ascending |
| 13 | Sort - price desc | Select "価格が高い順" | Results reorder by price descending |
| 14 | Clear filters | Click "フィルターをクリア" | URL resets to `/explore`, all filters cleared |
| 15 | Pagination | If >1 page, click page 2 | URL adds `?page=2`, different results shown, pagination highlights page 2 |
| 16 | Previous/Next | Click "次へ" then "前へ" | Navigation works correctly |
| 17 | Search | Enter query in search field and submit | URL adds `?q=<query>`, h1 changes to "「query」の検索結果", results filtered |
| 18 | Empty state | Apply impossible filter combo | "SearchX" icon shown, "フィルターをクリアして探す" button visible, 5 popular subject quick-links shown |
| 19 | Mobile filters | Set viewport 375x667, tap filter button | Mobile filter sheet opens, same filter options available |
| 20 | Problem card | Click any card | Navigates to `/problem/[id]` |
| 21 | Favorite toggle | Click heart icon on card (while logged in) | Heart fills/unfills, favorite toggled without page reload |
| 22 | Result count | Check count text | Shows "N件の問題セット" matching actual count |

### 3.3 Subject Explore Page — `/explore/[subject]`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Valid subject | Navigate to `/explore/math` | h1 shows "数学の問題を探す", breadcrumb shows ホーム / 探す / 数学 |
| 2 | Invalid subject | Navigate to `/explore/invalid` | 404 Not Found page |
| 3 | All 9 subjects | Navigate to each: `math`, `english`, `japanese`, `physics`, `chemistry`, `biology`, `japanese_history`, `world_history`, `geography` | Each renders with correct subject label in h1 |
| 4 | Filters | Apply difficulty filter | Results filtered, same behavior as `/explore` |
| 5 | Breadcrumb nav | Click "探す" breadcrumb | Navigates to `/explore` |

### 3.4 Rankings Page — `/rankings`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/rankings` | Trophy icon, h1 "ランキング", subtitle "人気の問題セット Top 50" |
| 2 | Breadcrumbs | Check breadcrumbs | ホーム / ランキング |
| 3 | Purchase ranking tab | Click "購入数ランキング" (default) | Tab active, results sorted by purchase count |
| 4 | Rating ranking tab | Click "高評価ランキング" | URL updates to `?tab=rating`, results sorted by rating |
| 5 | Tab preserves subject | Select subject then switch tab | Subject filter persists across tab changes |
| 6 | Subject filter pills | Click "数学" pill | URL updates to `?subject=math`, results filtered |
| 7 | "すべて" pill | Click "すべて" | Subject filter cleared |
| 8 | Ranking card styling | Check positions 1-3 | Gold/silver/bronze styling applied to rank numbers |
| 9 | Card content | Inspect any card | Shows rank number, title, subject badge, difficulty badge, seller name, star rating, price, purchase count |
| 10 | Card click | Click a ranking card | Navigates to `/problem/[id]` |
| 11 | Max 50 items | Count results | At most 50 items displayed |
| 12 | Empty state | Filter to subject with no items | Empty state card with TrendingUp icon shown |

### 3.5 Seller Profile Page — `/seller/[id]`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/seller/{SELLER_ID}` | Seller profile renders |
| 2 | Profile header | Inspect header card | Avatar (or initials fallback), display name, tier badge (bronze/silver/gold/platinum) |
| 3 | Verified badge | Check for badge | "認証済み" badge with ShieldCheck icon shown if Stripe connected |
| 4 | Info fields | Check details | University name, circle name, seller description visible |
| 5 | Stats grid | Inspect stats | 5 stats: 問題セット, 購入者, 平均評価, レビュー数, 登録日 |
| 6 | Problem sets | Scroll to problem list | "公開中の問題セット" section with problem set cards (or empty state) |
| 7 | Review summary | Scroll to reviews | Rating summary with average and distribution (if reviews exist) |
| 8 | Report button | Click "出品者を報告" | Report dialog opens |
| 9 | Invalid seller | Navigate to `/seller/invalid-uuid` | 404 Not Found page |
| 10 | Incomplete seller | Navigate to seller with `tos_accepted_at` null | 404 Not Found page |

### 3.6 Welcome Page — `/welcome`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/welcome` | Welcome page renders without errors |
| 2 | Content | Inspect page | Welcome message/onboarding content visible |
| 3 | CTA | Check for action buttons | Navigation to next step or dashboard |

---

## 4. Auth Pages

### 4.1 Login Page — `/login`

(Covered in Section 2.1 for the happy path. Additional checks below.)

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Error display | Navigate to `/login?error=auth_callback_failed` | Error banner shown with role="alert", Japanese error message |
| 2 | Error - access denied | Navigate to `/login?error=access_denied` | Appropriate Japanese error message |
| 3 | Error - server error | Navigate to `/login?error=server_error` | Appropriate Japanese error message |
| 4 | Error - session expired | Navigate to `/login?error=session_expired` | Appropriate Japanese error message |
| 5 | Invalid credentials | Enter wrong password, submit | Error message shown (Japanese), form not cleared |
| 6 | Button loading state | Click login, observe button | Spinner icon appears, text "ログイン" unchanged, button width unchanged |
| 7 | OAuth loading state | Click Google button | Spinner replaces Google icon, other OAuth button also disabled |
| 8 | Next param redirect | Navigate to `/login?next=/sell/analytics`, login | Redirected to `/sell/analytics` (not `/dashboard`) |
| 9 | Safe redirect | Navigate to `/login?next=/login`, login | Redirected to `/dashboard` (prevents loop) |
| 10 | Mobile layout | Set viewport 375x667 | Single column, mobile logo shown, brand panel hidden |
| 11 | Legal links | Click terms/privacy links | Navigate to `/legal/terms` and `/legal/privacy` |
| 12 | Desktop brand panel | Viewport 1280x720 | Left panel with gradient background, headline, 4 benefit items |

### 4.2 Signup Page — `/signup`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/signup` | Registration form visible with BookOpen icon, h2 "アカウントを作成" |
| 2 | Form fields | Inspect form | Email, password, confirm password inputs present |
| 3 | Password validation | Enter <8 char password, submit | Client-side error about minimum length |
| 4 | Password mismatch | Enter different passwords, submit | Client-side error about password mismatch |
| 5 | Login link | Click "ログイン" | Navigates to `/login` |
| 6 | Legal links | Check footer | Links to terms and privacy policy |
| 7 | Success state | After successful signup | Shows CheckCircle2 icon, "確認メールを送信しました", submitted email shown |
| 8 | Success - login link | Click "ログインページに戻る" | Navigates to `/login` |

### 4.3 Forgot Password Page — `/forgot-password`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/forgot-password` | Mail icon, h title "パスワードをリセット", email input |
| 2 | Submit | Enter valid email, submit | Success state shown, confirmation message |
| 3 | Back link | Click back/login link | Navigates to `/login` |
| 4 | Empty submit | Submit without email | Validation error |

### 4.4 Reset Password Page — `/reset-password`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/reset-password` | Password reset form visible |
| 2 | Password fields | Inspect form | New password and confirm password inputs |
| 3 | Validation | Enter mismatched passwords | Error message shown |
| 4 | Short password | Enter <8 chars | Validation error |

---

## 5. Dashboard Pages (Auth Required)

> **Prerequisite:** Login with test credentials before all tests in this section.

### 5.1 Dashboard Main — `/dashboard`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/dashboard` | Greeting "こんにちは、{name}さん" or "ダッシュボード" heading |
| 2 | Stat cards | Inspect 4 stat cards | 購入済みセット, 総解答回数, 平均正答率, 連続学習日数 — each with number and link |
| 3 | Stat card links | Click 購入済みセット card | Navigates to `/dashboard/history` |
| 4 | Stat card links | Click 平均正答率 card | Navigates to `/dashboard/analytics` |
| 5 | Continue studying | Check "学習を続ける" section | Up to 3 purchased-but-unsubmitted sets shown with "解答する" buttons |
| 6 | Solve button | Click "解答する" on a card | Navigates to `/problem/[id]/solve` |
| 7 | Recommendations | Check "おすすめの問題セット" | Up to 6 ProblemSetCards, filtered by preferred subjects |
| 8 | "もっと見る" link | Click recommendation "もっと見る" | Navigates to `/explore?subjects=...` |
| 9 | Recent purchases | Check 最近の購入 card | Up to 5 recent purchases, each row clickable → `/problem/[id]` |
| 10 | Recent submissions | Check 最近の解答 card | Up to 5 recent submissions with score badges, each → `/problem/[id]/result/[sid]` |
| 11 | Empty state | If no purchases AND no submissions | Dashed card with CTA to `/explore` |
| 12 | Mobile layout | Set viewport 375x667 | Cards stack vertically, stat grid adapts |
| 13 | Sidebar (desktop) | Check left sidebar | Dashboard navigation links, subscription usage meter |
| 14 | Mobile nav | Check mobile tab bar | Tab navigation visible below navbar |

### 5.2 Submission History — `/dashboard/history`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/dashboard/history` | Breadcrumbs: ホーム / マイページ / 解答履歴 |
| 2 | History list | Inspect list | Submission rows with problem title, subject, score, date |
| 3 | Subject filter | Select a subject filter | List filtered to that subject |
| 4 | Row click | Click a submission row | Navigates to result page `/problem/[id]/result/[sid]` |
| 5 | Empty state | If no submissions | Empty state message shown |

### 5.3 Favorites — `/dashboard/favorites`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/dashboard/favorites` | Breadcrumbs: ホーム / マイページ / お気に入り |
| 2 | Favorites list | Inspect list | Problem set cards/rows with title, subject, price, seller |
| 3 | Subject filter | Select a subject filter | List filtered |
| 4 | Unfavorite | Click unfavorite button on an item | Item removed from list (optimistic update) |
| 5 | Empty state | If no favorites | Empty state shown |

### 5.4 Recently Viewed — `/dashboard/recently-viewed`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/dashboard/recently-viewed` | Breadcrumbs: ホーム / マイページ / 最近閲覧した問題 |
| 2 | Header | Inspect header | Eye icon, title "最近閲覧した問題", item count, ClearHistoryButton |
| 3 | Card grid | Inspect grid | Cards with title, price, subject badge, difficulty badge, "viewed N ago" timestamp |
| 4 | Card click | Click a card | Navigates to `/problem/[id]` |
| 5 | Clear history | Click ClearHistoryButton | List clears |
| 6 | Empty state | If no history | Dashed card with "問題を探す" CTA → `/explore` |
| 7 | Max items | Check count | At most 50 items |

### 5.5 Learning Analytics — `/dashboard/analytics`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/dashboard/analytics` | Breadcrumbs: ホーム / マイページ / 学習分析, h1 "学習分析" |
| 2 | Insufficient data | If <3 submissions | Prompt card shown suggesting more problem solving |
| 3 | Stat cards | If >=3 submissions | 4 stat cards: 総回答回数, 平均正答率, 学習科目数, 連続学習日数 |
| 4 | Study streak | Inspect StudyStreak component | Activity heatmap, current streak, longest streak |
| 5 | Score comparison | Inspect ScoreComparison | Score trend line chart |
| 6 | Subject radar | Inspect SubjectRadar | Radar chart of per-subject performance |
| 7 | Mobile layout | Set viewport 375x667 | Charts stack vertically, readable at small size |

### 5.6 Collections — `/dashboard/collections`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/dashboard/collections` | Collections list/grid visible |
| 2 | Create collection | Click create button | Collection creation dialog/form opens |
| 3 | Collection card | Click a collection | Navigates to `/dashboard/collections/[id]` |
| 4 | Empty state | If no collections | Empty state with CTA |

### 5.7 Collection Detail — `/dashboard/collections/[id]`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/dashboard/collections/{COLLECTION_ID}` | Collection name, item list visible |
| 2 | Item list | Inspect items | Problem sets listed with titles, subjects, actions |
| 3 | Remove item | Click remove on an item | Item removed from collection |
| 4 | Solve button | Click solve/start button | Navigates to `/dashboard/collections/[id]/solve` |
| 5 | Invalid ID | Navigate to `/dashboard/collections/invalid` | 404 or error page |

### 5.8 Collection Solve — `/dashboard/collections/[id]/solve`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to solve URL | Problem solving interface loads with collection context |
| 2 | Problem navigation | Navigate between problems | Can move between problems in collection |
| 3 | Answer input | Enter answers | Answer fields accept input based on question type |

---

## 6. Seller Pages (Auth + Seller Profile Required)

> **Prerequisite:** Login with test credentials. Seller onboarding must be completed.

### 6.1 Seller Dashboard — `/sell`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell` | Seller dashboard loads with breadcrumbs |
| 2 | ToS gate | If ToS not accepted | SellerTosGate modal shown |
| 3 | Onboarding banner | If profile/Stripe incomplete | Onboarding completion banner shown |
| 4 | Stats overview | Inspect stat cards | Published count, draft count, purchases (30-day), revenue, submissions, average rating — each with trend indicator (up/down/flat) |
| 5 | Quick actions | Check action buttons | "新規作成" (PlusCircle), "インポート" (FileUp) buttons visible |
| 6 | Problem set list | Inspect ProblemSetList | Table/grid of seller's problem sets with title, subject, status badge, price, actions |
| 7 | Edit link | Click edit on a problem set | Navigates to `/sell/[id]/edit` |
| 8 | Analytics link | Check navigation | Link to `/sell/analytics` |
| 9 | Mobile layout | Set viewport 375x667 | Stats stack, table scrolls horizontally or card layout |

### 6.2 Seller Onboarding — `/sell/onboarding`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/onboarding` | Onboarding wizard visible with step indicator |
| 2 | Step 1 - ToS | Check ToS step | ToS acceptance UI (checkbox + button) |
| 3 | Step 2 - Profile | Check profile step | Seller display name, description, university, circle name fields |
| 4 | Step 3 - Stripe | Check Stripe step | Stripe Connect onboarding button |
| 5 | Step indicator | Verify progress | Current step highlighted, completed steps marked |
| 6 | Navigation | Move between steps | Can go back to previous steps |

### 6.3 Sales Analytics — `/sell/analytics`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/analytics` | Analytics dashboard with charts |
| 2 | Revenue chart | Inspect chart | Revenue over time chart visible |
| 3 | Period selector | Change time period | Chart updates to show selected period |
| 4 | Per-product breakdown | Inspect breakdown | Revenue/purchases per problem set |

### 6.4 Create Problem Set — `/sell/new`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/new` | Problem set creation form |
| 2 | Required fields | Inspect form | Title, subject dropdown, difficulty dropdown, description, price |
| 3 | Subject dropdown | Open dropdown | All 9 subjects listed with Japanese labels |
| 4 | Difficulty dropdown | Open dropdown | Difficulty options listed |
| 5 | Price input | Enter price | Accepts numeric input, ¥ formatting |
| 6 | PDF upload | Upload a PDF | File upload works, preview shown |
| 7 | Cover image | Upload cover image | Image preview shown |
| 8 | Form validation | Submit with missing required fields | Validation errors shown |
| 9 | Save as draft | Click save draft | Problem set saved, redirect to edit page |

### 6.5 Edit Problem Set — `/sell/[id]/edit`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/{PROBLEM_SET_ID}/edit` | Edit form populated with existing data |
| 2 | Edit fields | Modify title, description | Fields editable |
| 3 | Save changes | Click save | Changes saved, success feedback |
| 4 | Preview | Check preview functionality | Problem preview matches edits |
| 5 | Publish | Click publish button | Status changes to published |
| 6 | Unauthorized | Navigate to another seller's set | Access denied / redirect |

### 6.6 Rubric Editor — `/sell/[id]/rubric`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/{PROBLEM_SET_ID}/rubric` | Rubric editor loads |
| 2 | Add section | Click add section | New section form appears |
| 3 | Add question | Add question to section | Question form with type selector, points, rubric elements |
| 4 | Question types | Select each type (essay, fill-in, mark-sheet) | Type-specific rubric fields shown |
| 5 | Points allocation | Set points for elements | Points sum validated |
| 6 | Model answer | Enter model answer | Text field accepts input |
| 7 | Save rubric | Click save | Rubric saved, JSON structure validated |

### 6.7 Submissions View — `/sell/[id]/submissions`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/{PROBLEM_SET_ID}/submissions` | Submissions list for this problem set |
| 2 | Submission rows | Inspect rows | Shows user, score, date, status |
| 3 | Detail view | Click a submission | Submission details visible |

### 6.8 Announce Problem Set — `/sell/[id]/announce`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/{PROBLEM_SET_ID}/announce` | Announcement creation form |
| 2 | Message field | Enter announcement text | Text area accepts input |
| 3 | Send | Submit announcement | Announcement sent, confirmation shown |

### 6.9 Seller Settings — `/sell/settings`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/settings` | Seller-specific settings page |
| 2 | Settings fields | Inspect options | Seller profile settings, notification preferences |
| 3 | Save | Modify and save | Changes persisted |

### 6.10 Coupons — `/sell/coupons`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/coupons` | Coupon management page |
| 2 | Create coupon | Click create button | Coupon creation form (code, discount, expiry) |
| 3 | Coupon list | Inspect list | Active/expired coupons shown |
| 4 | Delete coupon | Click delete on a coupon | Coupon removed with confirmation |

### 6.11 Payouts — `/sell/payouts`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/payouts` | Payout history/dashboard |
| 2 | Payout list | Inspect list | Payouts with amounts, dates, status |
| 3 | Stripe dashboard link | Check for external link | Link to Stripe Express dashboard |

### 6.12 Transactions — `/sell/transactions`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/transactions` | Transaction history |
| 2 | Transaction rows | Inspect rows | Shows buyer, amount, fee, net, date |
| 3 | Filtering | Apply date/status filter | Results filtered |

### 6.13 Question Pool — `/sell/pool`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/pool` | Question pool list |
| 2 | Question list | Inspect list | Individual questions with type, subject, status |
| 3 | Create button | Click create new | Navigates to `/sell/pool/new` |

### 6.14 New Question — `/sell/pool/new`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/pool/new` | Question creation form |
| 2 | Question type | Select type | Type-specific fields shown |
| 3 | Save | Fill and save | Question saved to pool |

### 6.15 Edit Question — `/sell/pool/[qid]/edit`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to edit URL | Edit form populated |
| 2 | Edit fields | Modify content | Fields editable |
| 3 | Save | Click save | Changes persisted |

### 6.16 Import Questions — `/sell/pool/import`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/pool/import` | Import interface |
| 2 | File upload | Upload CSV/JSON | File accepted, preview shown |
| 3 | Import | Confirm import | Questions imported to pool |

### 6.17 New Set from Pool — `/sell/sets/new`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/sell/sets/new` | Set creation from pool interface |
| 2 | Question selection | Select questions from pool | Questions added to new set |
| 3 | Ordering | Reorder questions | Drag-and-drop or arrow buttons work |
| 4 | Save | Save problem set | Set created, redirect to edit page |

---

## 7. Problem Pages

### 7.1 Problem Detail — `/problem/[id]`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/problem/{PROBLEM_SET_ID}` | Full problem detail page loads |
| 2 | Metadata | Check page title | Title includes problem name |
| 3 | Problem info | Inspect header | Title, subject badge, difficulty badge, university name, price |
| 4 | Seller info | Inspect seller card | Avatar, seller name, link to `/seller/[id]` |
| 5 | Purchase section | Check PurchaseSection | Buy button (if not purchased), or "解答する" (if purchased) |
| 6 | Free problem | If price is ¥0 | "無料で入手" or equivalent button |
| 7 | Already purchased | If already purchased | "解答する" button → `/problem/[id]/solve`, submission history link |
| 8 | Tabs | Check ProblemDetailTabs | Description tab, sample questions tab (with preview), reviews tab, Q&A tab |
| 9 | Sample preview | Click sample tab | SampleQuestionPreview renders |
| 10 | Reviews section | Click reviews tab | ReviewsSection loads with star ratings, review list |
| 11 | Q&A section | Click Q&A tab | QaSection loads with question list |
| 12 | Add to collection | Click AddToCollectionDialog button | Dialog opens, collections listed |
| 13 | Share button | Click ShareButton | Share options shown |
| 14 | Report button | Click report | ReportDialog opens |
| 15 | PDF download | If purchased, check PdfDownloadButton | PDF download works |
| 16 | Related problems | Scroll to bottom | Related ProblemSetCards shown |
| 17 | JSON-LD | Inspect page source | Product JSON-LD structured data present |
| 18 | Mobile layout | Set viewport 375x667 | Responsive layout, no overflow |
| 19 | Invalid ID | Navigate to `/problem/invalid-uuid` | 404 Not Found page |

### 7.2 Solve Problem — `/problem/[id]/solve`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/problem/{PROBLEM_SET_ID}/solve` (must be purchased) | Solve interface with SolveClient component |
| 2 | Auth check | Visit without login | Redirected to `/login` |
| 3 | Purchase check | Visit without purchase | Access denied / redirect |
| 4 | Subscription check | Inspect subscription state | Usage limits enforced per tier |
| 5 | Answer inputs | Inspect per-question inputs | Type-appropriate inputs (essay textarea, fill-in text, mark-sheet radio/checkbox) |
| 6 | Section navigation | Navigate between sections | Section tabs/numbers work |
| 7 | Submit answers | Fill all answers and submit | Submission sent, loading state shown, redirect to result page |
| 8 | AI assistant | Click AiAssistantDialog button | Assistant dialog opens (if subscription allows) |
| 9 | Exit button | Click exit/back | Navigation back with confirmation if unsaved |
| 10 | Breadcrumb | Check breadcrumb | Problem name in breadcrumb, clickable |

### 7.3 Grading Result — `/problem/[id]/result/[sid]`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/problem/{PROBLEM_SET_ID}/result/{SUBMISSION_ID}` | Result page loads |
| 2 | Score display | Check score | Total score, per-section scores displayed |
| 3 | Score comparison | Check ScoreComparison | Comparison chart visible |
| 4 | Per-question feedback | Inspect feedback | AI-generated feedback for each question |
| 5 | Partial credit | Check essay question results | Rubric element checklist with points awarded |
| 6 | Retry button | Click "もう一度解答する" or similar | Navigates back to solve page |
| 7 | History link | Check link to history | Navigates to `/problem/[id]/history` |
| 8 | Invalid IDs | Navigate with invalid submission ID | Error or 404 page |

### 7.4 Problem Submission History — `/problem/[id]/history`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/problem/{PROBLEM_SET_ID}/history` | Submission history for this problem |
| 2 | History list | Inspect rows | Each attempt with date, score, link to result |
| 3 | Score trend | Check for trend visualization | Score improvement over attempts shown |
| 4 | Result link | Click a history row | Navigates to `/problem/[id]/result/[sid]` |

### 7.5 Print Problem — `/problem/[id]/print`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/problem/{PROBLEM_SET_ID}/print` | Print-optimized layout |
| 2 | Print styling | Check CSS | Print-specific styles applied, no navigation elements |
| 3 | Content | Verify content | Problem content visible, formatted for A4 |

---

## 8. Settings Pages (Auth Required)

> **Prerequisite:** Login with test credentials.

### 8.1 Settings Index — `/settings`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Redirect | Navigate to `/settings` | Automatically redirected to `/settings/profile` |

### 8.2 Profile Settings — `/settings/profile`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/settings/profile` | Profile edit form visible |
| 2 | Layout | Check settings sidebar | Navigation sidebar with all settings sections |
| 3 | Display name | Edit display name | Field editable, validation present |
| 4 | Avatar | Upload avatar | Image upload works, preview shown |
| 5 | Preferred subjects | Select subjects | Multi-select works |
| 6 | Save | Click save | Changes saved, success toast |
| 7 | Validation | Submit empty display name | Validation error shown |

### 8.3 Billing Settings — `/settings/billing`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/settings/billing` | Billing information page |
| 2 | Current plan | Check plan display | Current subscription tier shown |
| 3 | Billing portal | Click manage billing | Redirects to Stripe billing portal |
| 4 | Payment history | Inspect history | Past payments listed |

### 8.4 Subscription — `/settings/subscription`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/settings/subscription` | Subscription management page |
| 2 | Plan comparison | Inspect plan cards | Basic (¥500/mo) and Pro (¥2,000/mo) plans with feature matrix |
| 3 | Annual toggle | Toggle annual billing | Prices update to annual amounts (Basic ¥4,000/yr, Pro ¥15,000/yr) |
| 4 | Current plan highlight | Check current plan | Current plan indicated, upgrade/downgrade buttons for other plans |
| 5 | Subscribe button | Click subscribe on a plan | Redirects to Stripe Checkout |
| 6 | Cancel subscription | If subscribed, click cancel | Confirmation dialog, cancellation processed |

### 8.5 Notification Preferences — `/settings/notifications`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/settings/notifications` | Notification preference toggles |
| 2 | Toggle options | Inspect toggles | Per-type notification toggles (email, in-app) |
| 3 | Save | Toggle and save | Preferences saved |

### 8.6 Sessions — `/settings/sessions`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/settings/sessions` | Active sessions list |
| 2 | Current session | Identify current | Current session marked |
| 3 | Revoke session | Click revoke on another session | Session revoked |

### 8.7 Delete Account — `/settings/delete-account`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/settings/delete-account` | Account deletion page with warnings |
| 2 | Warnings | Inspect warnings | Clear warning about data loss, irreversibility |
| 3 | Confirmation | Check confirmation UI | Requires typing confirmation text or checkbox |
| 4 | Delete button | Check button state | Disabled until confirmation completed |

### 8.8 Seller Profile Settings — `/settings/seller`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/settings/seller` | Seller profile settings form |
| 2 | Fields | Inspect form | Seller display name, description, university, circle name |
| 3 | Edit | Modify fields and save | Changes saved |
| 4 | Stripe status | Check Stripe connection status | Connected/disconnected status shown |

---

## 9. Notifications (Auth Required)

### 9.1 Notifications Page — `/notifications`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/notifications` | Breadcrumbs visible, notification list loads |
| 2 | Notification list | Inspect list | Notifications with type icon, message, timestamp |
| 3 | Type filter | Click type filter tabs | Filters: all, purchase, grading, review, announcement, subscription, system |
| 4 | Filter by purchase | Click "purchase" filter | URL updates to `?type=purchase`, only purchase notifications shown |
| 5 | Pagination | If >20 notifications, check pagination | Pagination controls visible, page navigation works |
| 6 | Unread count | Check unread badge | Unread count displayed |
| 7 | Mark as read | Click a notification | Notification marked as read |
| 8 | Empty state | Filter to type with no notifications | Empty state message |
| 9 | Notification bell (navbar) | Check AppNavbar bell icon | NotificationBell shows unread count badge |

---

## 10. Admin Pages (Auth + Admin Required)

> **Note:** These pages require admin privileges. Test account may not have admin access. If not, verify that non-admin users receive appropriate access denied response.

### 10.1 Admin Dashboard — `/admin`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/admin` | Admin dashboard with stat overview |
| 2 | Admin check | Verify admin-only access | Non-admin users redirected or shown access denied |
| 3 | Stats | Inspect stat cards | User count, seller count, revenue, active subscriptions, problem sets, reports |
| 4 | Charts | Check weekly bar charts | SVG charts render correctly |
| 5 | Quick nav | Check navigation cards | Links to users, sellers, reports, refunds, announcements, audit, revenue |
| 6 | Mobile sidebar | Check AdminMobileSidebar | Mobile navigation works |

### 10.2 User Management — `/admin/users`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/admin/users` | User list table |
| 2 | Search | Search for a user | Results filtered |
| 3 | User details | Click a user row | User detail view/modal |
| 4 | Pagination | Navigate pages | Pagination works |

### 10.3 Seller Management — `/admin/sellers`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/admin/sellers` | Seller list table |
| 2 | Status filters | Filter by verification status | Results filtered |
| 3 | Seller details | Click a seller row | Seller detail view |

### 10.4 Reports — `/admin/reports`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/admin/reports` | Content reports list |
| 2 | Report details | Click a report | Report detail with reporter, reported content, reason |
| 3 | Take action | Use action buttons (dismiss, warn, remove) | Action processed |
| 4 | Status filter | Filter by status (pending, resolved, dismissed) | Results filtered |

### 10.5 Refunds — `/admin/refunds`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/admin/refunds` | Refund requests list |
| 2 | Process refund | Click approve/deny on a refund | Refund processed |

### 10.6 Announcements — `/admin/announcements`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/admin/announcements` | Announcements management |
| 2 | Create announcement | Click create | Announcement form opens |
| 3 | Publish | Fill and publish | Announcement created, visible to users |

### 10.7 Audit Log — `/admin/audit`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/admin/audit` | Audit log entries |
| 2 | Entries | Inspect entries | Actions, actors, timestamps, details |
| 3 | Filter | Filter by action type or date | Results filtered |

### 10.8 Revenue Dashboard — `/admin/revenue`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/admin/revenue` | Revenue analytics |
| 2 | Charts | Inspect revenue charts | Revenue over time, by product, by seller |
| 3 | Period selector | Change time period | Charts update |

---

## 11. Help Pages (Public)

### 11.1 Help Center — `/help`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/help` | Help center main page |
| 2 | Categories | Inspect help categories | Topic cards/links visible |
| 3 | Navigation | Check internal links | Links to FAQ, seller guide work |
| 4 | Layout | Check help layout | Help-specific sidebar/navigation from help layout |

### 11.2 FAQ — `/help/faq`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/help/faq` | FAQ page with accordion/expandable items |
| 2 | Expand/collapse | Click a question | Answer expands, click again collapses |
| 3 | All items | Verify all questions have answers | No empty answers |
| 4 | Categories | Check question grouping | Questions organized by category |

### 11.3 Seller Guide — `/help/seller-guide`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/help/seller-guide` | Seller guide content |
| 2 | Sections | Check guide sections | Step-by-step selling guide, rubric creation tips, payout info |
| 3 | Internal links | Check links | Links to relevant seller pages work |

---

## 12. Legal Pages (Public)

### 12.1 Legal Index — `/legal`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/legal` | Legal page index with links to all policies |
| 2 | Links | Verify all links | Links to terms, privacy, tokushoho, seller-tos, content-policy, refund |

### 12.2 Terms of Service — `/legal/terms`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/legal/terms` | Terms page renders, Japanese text |
| 2 | Content | Scroll through | Full terms visible, no broken formatting |
| 3 | Last updated | Check for date | Last updated date visible |

### 12.3 Privacy Policy — `/legal/privacy`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/legal/privacy` | Privacy policy renders |
| 2 | Content | Scroll through | Full policy visible, APPI compliance mentioned |

### 12.4 Tokushoho — `/legal/tokushoho`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/legal/tokushoho` | 特定商取引法に基づく表示 page renders |
| 2 | Required fields | Inspect content | All legally required fields present (business name, address, contact, etc.) |

### 12.5 Seller Terms — `/legal/seller-tos`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/legal/seller-tos` | Seller-specific terms render |
| 2 | Content | Scroll through | Seller obligations, copyright policy, payout terms |

### 12.6 Content Policy — `/legal/content-policy`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/legal/content-policy` | Content policy renders |
| 2 | Prohibited content | Check section | Clear rules about prohibited content (copying exam questions, etc.) |

### 12.7 Refund Policy — `/legal/refund`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/legal/refund` | Refund policy renders |
| 2 | Conditions | Check content | Refund conditions and process clearly stated |

---

## 13. Purchase Flow

### 13.1 Purchase a Problem Set

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Navigate | Go to `/problem/{PROBLEM_SET_ID}` (unpurchased, paid) | Purchase button visible with price |
| 2 | Click purchase | Click purchase button | Redirects to Stripe Checkout or inline purchase flow |
| 3 | Stripe Checkout | Complete payment on Stripe | Payment processed |
| 4 | Success page | After payment | Redirected to `/purchase/success` |
| 5 | Success content | Inspect success page | Confirmation message, link to solve, link to dashboard |
| 6 | Problem access | Navigate back to problem | "解答する" button now visible instead of purchase button |

### 13.2 Purchase a Free Problem Set

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Navigate | Go to free problem set detail | Free label visible, acquire button |
| 2 | Acquire | Click acquire button | Instant acquisition (no Stripe), redirect to solve or success |

### 13.3 Purchase Success — `/purchase/success`

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Page load | Navigate to `/purchase/success` (with valid session) | Success page renders |
| 2 | Content | Inspect page | Confirmation message, purchased item info, action links |
| 3 | Navigation | Click "解答する" or similar CTA | Navigates to solve page |
| 4 | Invalid access | Navigate without valid purchase session | Error or redirect |

---

## 14. Error & Not-Found Pages

### 14.1 Global Not Found — any invalid URL

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | 404 page | Navigate to `/this-does-not-exist` | Custom 404 page renders, not default Next.js 404 |
| 2 | Navigation | Check for home link | Link back to `/` present |

### 14.2 Segment-Specific Not Found Pages

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Dashboard | Trigger not-found in dashboard | Dashboard-specific not-found UI |
| 2 | Problem | Navigate to `/problem/nonexistent-uuid` | Problem-specific not-found UI |
| 3 | Seller | Navigate to `/seller/nonexistent-uuid` | Seller-specific not-found UI |
| 4 | Sell | Navigate to `/sell/nonexistent-uuid/edit` | Seller-specific not-found UI |
| 5 | Settings | Trigger settings not-found | Settings-specific not-found UI |

### 14.3 Error Boundaries

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Login error | `/login` error boundary | AlertCircle icon, "エラーが発生しました", "再試行" and "ホームに戻る" buttons |
| 2 | Dashboard error | Dashboard error boundary | Error UI with retry and home link |
| 3 | Problem error | Problem page error boundary | Error UI specific to problem pages |
| 4 | Solve error | Solve page error boundary | Error UI for solve failures |
| 5 | Result error | Result page error boundary | Error UI for result page |
| 6 | Rankings error | Rankings error boundary | Error UI |
| 7 | Explore error | Explore error boundary | Error UI |
| 8 | Sell error | Sell pages error boundary | Error UI |
| 9 | Settings error | Settings error boundary | Error UI |
| 10 | Admin error | Admin error boundary | Error UI |
| 11 | Notifications error | Notifications error boundary | Error UI |
| 12 | Help error | Help error boundary | Error UI |
| 13 | Purchase success error | Purchase success error boundary | Error UI |
| 14 | Global error | Root error boundary | Error UI |

---

## 15. Cross-Cutting UX Checks

These checks apply to EVERY page visited during the test run.

### 15.1 Responsive Design (per page)

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | No horizontal overflow | Set viewport 375x667, check each page | No horizontal scrollbar, all content within viewport |
| 2 | Touch targets | Inspect buttons/links on mobile | All interactive elements >= 44x44px tap area |
| 3 | Font readability | Check text size on mobile | Body text >= 14px, headings proportional |
| 4 | Image scaling | Check images | Images responsive, no overflow |

### 15.2 Navigation Consistency

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Navbar present | Check every authenticated page | AppNavbar visible with logo, nav links, user menu |
| 2 | Active state | Check nav item highlighting | Current page's nav item highlighted |
| 3 | Breadcrumbs | Check pages with breadcrumbs | Breadcrumb trail accurate, links work |
| 4 | Back button | Use browser back | Previous page loads correctly, no broken state |
| 5 | Footer | Check public pages | SiteFooter present with links |

### 15.3 Loading States

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Suspense skeletons | Observe page loads with throttled network | Skeleton/loading states shown before content |
| 2 | Button loading | Click submit buttons | Spinner icon appears, button text unchanged, width stable |
| 3 | No layout shift | Observe page loads | CLS minimal, no content jumping |

### 15.4 Accessibility

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | ARIA labels | Inspect interactive elements | Buttons, icons, charts have aria-label or aria-labelledby |
| 2 | Form labels | Inspect forms | All inputs have associated labels |
| 3 | Color contrast | Check text/background contrast | WCAG 2.1 AA compliance (4.5:1 for text, 3:1 for large text) |
| 4 | Keyboard navigation | Tab through pages | All interactive elements focusable, focus ring visible |
| 5 | Screen reader | Check semantic HTML | Proper heading hierarchy (h1 → h2 → h3), landmark regions |
| 6 | Alert roles | Check error messages | Error alerts have `role="alert"` |
| 7 | Image alt text | Check images | All images have meaningful alt text |

### 15.5 Japanese Text & i18n

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | All UI text in Japanese | Scan each page | User-facing text in Japanese (labels, buttons, headings, descriptions) |
| 2 | No untranslated strings | Check for English UI text | No English text in user-facing elements (except brand names) |
| 3 | Date formatting | Check date displays | Japanese locale formatting (e.g., 2026年3月23日 or relative) |
| 4 | Number formatting | Check prices, counts | Japanese number formatting with ¥ symbol |
| 5 | Sentence case | Check button text | Sentence case (not Title Case) per CLAUDE.md rule |

### 15.6 Button Layout Stability

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Login button | Trigger loading state | Text "ログイン" unchanged, icon swaps to spinner, width stable |
| 2 | All submit buttons | Trigger loading states | No text change, only icon change, width constant |
| 3 | OAuth buttons | Click OAuth button | Icon swaps to spinner, other button disabled, text unchanged |

### 15.7 Console Errors

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | No console errors | Monitor console on every page | Zero `console.error` entries (React errors, failed fetches, etc.) |
| 2 | No 404 resources | Monitor network tab | No failed resource loads (images, scripts, stylesheets) |
| 3 | No hydration errors | Check console on page load | No React hydration mismatch warnings |

### 15.8 Performance

| # | Check | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | LCP | Measure on each page | LCP < 2.5s on fast 3G or better |
| 2 | No infinite loading | Check all Suspense boundaries | All Suspense boundaries resolve within 10s |
| 3 | No memory leaks | Monitor memory on SPA navigation | Memory stable across page transitions |

---

## Appendix A: Complete URL Registry

### Static Routes (42 pages)

| # | URL | Auth | Group | Description |
|---|-----|------|-------|-------------|
| 1 | `/` | Public | Marketing | Landing page |
| 2 | `/explore` | Public | Marketing | Browse problem sets |
| 3 | `/rankings` | Public | Marketing | Rankings (Top 50) |
| 4 | `/welcome` | Public | Marketing | Welcome page |
| 5 | `/login` | Public | Auth | Email/password + OAuth login |
| 6 | `/signup` | Public | Auth | Email/password registration |
| 7 | `/forgot-password` | Public | Auth | Password reset request |
| 8 | `/reset-password` | Public | Auth | Password reset form |
| 9 | `/dashboard` | Auth | Dashboard | User dashboard main |
| 10 | `/dashboard/history` | Auth | Dashboard | Submission history |
| 11 | `/dashboard/favorites` | Auth | Dashboard | Favorited problem sets |
| 12 | `/dashboard/recently-viewed` | Auth | Dashboard | Recently viewed items |
| 13 | `/dashboard/analytics` | Auth | Dashboard | Learning analytics |
| 14 | `/dashboard/collections` | Auth | Dashboard | Collections list |
| 15 | `/sell` | Auth+Seller | Seller | Seller dashboard |
| 16 | `/sell/onboarding` | Auth | Seller | Seller onboarding wizard |
| 17 | `/sell/analytics` | Auth+Seller | Seller | Sales analytics |
| 18 | `/sell/new` | Auth+Seller | Seller | Create new problem set |
| 19 | `/sell/settings` | Auth+Seller | Seller | Seller settings |
| 20 | `/sell/coupons` | Auth+Seller | Seller | Coupon management |
| 21 | `/sell/payouts` | Auth+Seller | Seller | Payout history |
| 22 | `/sell/transactions` | Auth+Seller | Seller | Transaction history |
| 23 | `/sell/pool` | Auth+Seller | Seller | Question pool |
| 24 | `/sell/pool/new` | Auth+Seller | Seller | Create question |
| 25 | `/sell/pool/import` | Auth+Seller | Seller | Import questions |
| 26 | `/sell/sets/new` | Auth+Seller | Seller | Create set from pool |
| 27 | `/settings` | Auth | Settings | Redirects to /settings/profile |
| 28 | `/settings/profile` | Auth | Settings | Profile settings |
| 29 | `/settings/billing` | Auth | Settings | Billing info |
| 30 | `/settings/subscription` | Auth | Settings | Subscription management |
| 31 | `/settings/notifications` | Auth | Settings | Notification preferences |
| 32 | `/settings/sessions` | Auth | Settings | Session management |
| 33 | `/settings/delete-account` | Auth | Settings | Account deletion |
| 34 | `/settings/seller` | Auth | Settings | Seller profile settings |
| 35 | `/notifications` | Auth | Notifications | Notification center |
| 36 | `/admin` | Auth+Admin | Admin | Admin dashboard |
| 37 | `/admin/users` | Auth+Admin | Admin | User management |
| 38 | `/admin/sellers` | Auth+Admin | Admin | Seller management |
| 39 | `/admin/reports` | Auth+Admin | Admin | Content reports |
| 40 | `/admin/refunds` | Auth+Admin | Admin | Refund management |
| 41 | `/admin/announcements` | Auth+Admin | Admin | Announcements |
| 42 | `/admin/audit` | Auth+Admin | Admin | Audit log |
| 43 | `/admin/revenue` | Auth+Admin | Admin | Revenue analytics |
| 44 | `/purchase/success` | Auth | Purchase | Purchase confirmation |
| 45 | `/help` | Public | Help | Help center |
| 46 | `/help/faq` | Public | Help | FAQ |
| 47 | `/help/seller-guide` | Public | Help | Seller guide |
| 48 | `/legal` | Public | Legal | Legal index |
| 49 | `/legal/terms` | Public | Legal | Terms of service |
| 50 | `/legal/privacy` | Public | Legal | Privacy policy |
| 51 | `/legal/tokushoho` | Public | Legal | 特定商取引法表示 |
| 52 | `/legal/seller-tos` | Public | Legal | Seller terms |
| 53 | `/legal/content-policy` | Public | Legal | Content policy |
| 54 | `/legal/refund` | Public | Legal | Refund policy |

### Dynamic Routes (15 pages)

| # | URL Pattern | Auth | Group | Description |
|---|-------------|------|-------|-------------|
| 55 | `/explore/[subject]` | Public | Marketing | Subject-filtered explore (9 valid subjects) |
| 56 | `/problem/[id]` | Public | Problem | Problem detail |
| 57 | `/problem/[id]/solve` | Auth+Purchase | Problem | Answer submission |
| 58 | `/problem/[id]/result/[sid]` | Auth | Problem | Grading result |
| 59 | `/problem/[id]/history` | Auth | Problem | Problem submission history |
| 60 | `/problem/[id]/print` | Auth | Problem | Print-optimized view |
| 61 | `/seller/[id]` | Public | Marketing | Seller profile |
| 62 | `/sell/[id]/edit` | Auth+Seller+Owner | Seller | Edit problem set |
| 63 | `/sell/[id]/rubric` | Auth+Seller+Owner | Seller | Edit rubric |
| 64 | `/sell/[id]/submissions` | Auth+Seller+Owner | Seller | View submissions |
| 65 | `/sell/[id]/announce` | Auth+Seller+Owner | Seller | Create announcement |
| 66 | `/sell/pool/[qid]/edit` | Auth+Seller+Owner | Seller | Edit pool question |
| 67 | `/dashboard/collections/[id]` | Auth+Owner | Dashboard | Collection detail |
| 68 | `/dashboard/collections/[id]/solve` | Auth+Owner | Dashboard | Solve collection |

### API Routes (not browser-tested, listed for reference)

| # | URL | Method | Purpose |
|---|-----|--------|---------|
| 69 | `/api/grading` | POST | AI grading submission |
| 70 | `/api/purchase` | POST | Create purchase |
| 71 | `/api/subscription` | POST | Manage subscription |
| 72 | `/api/billing-portal` | POST | Stripe billing portal redirect |
| 73 | `/api/account/delete` | DELETE | Delete account |
| 74 | `/api/webhooks/stripe` | POST | Stripe webhook handler |
| 75 | `/api/health` | GET | Health check |
| 76 | `/api/pdf` | POST | PDF generation |
| 77 | `/api/pdf-import` | POST | PDF import |
| 78 | `/api/ai-assistant` | POST | AI study assistant |
| 79 | `/api/coupon/validate` | POST | Coupon validation |
| 80 | `/api/reviews/helpful` | POST | Mark review helpful |

### Error Boundary Files (14 files)

| # | Path | Covers |
|---|------|--------|
| 1 | `app/error.tsx` | Root error boundary |
| 2 | `app/login/error.tsx` | Login page errors |
| 3 | `app/(dashboard)/dashboard/error.tsx` | Dashboard errors |
| 4 | `app/(marketing)/explore/error.tsx` | Explore page errors |
| 5 | `app/(seller)/sell/error.tsx` | Seller page errors |
| 6 | `app/settings/error.tsx` | Settings errors |
| 7 | `app/admin/error.tsx` | Admin errors |
| 8 | `app/notifications/error.tsx` | Notifications errors |
| 9 | `app/problem/[id]/error.tsx` | Problem page errors |
| 10 | `app/problem/[id]/solve/error.tsx` | Solve page errors |
| 11 | `app/problem/[id]/result/[sid]/error.tsx` | Result page errors |
| 12 | `app/help/error.tsx` | Help page errors |
| 13 | `app/purchase/success/error.tsx` | Purchase success errors |
| 14 | `app/rankings/error.tsx` | Rankings errors |

### Not-Found Files (6 files)

| # | Path | Covers |
|---|------|--------|
| 1 | `app/not-found.tsx` | Global 404 |
| 2 | `app/(dashboard)/dashboard/not-found.tsx` | Dashboard 404 |
| 3 | `app/problem/[id]/not-found.tsx` | Problem 404 |
| 4 | `app/(seller)/sell/not-found.tsx` | Seller 404 |
| 5 | `app/settings/not-found.tsx` | Settings 404 |
| 6 | `app/seller/[id]/not-found.tsx` | Seller profile 404 |

---

## Appendix B: Test Execution Order

The recommended execution order ensures authentication state is established early and reused:

1. **Phase 1 — Public pages (no auth):** `/`, `/explore`, `/explore/math`, `/rankings`, `/help`, `/help/faq`, `/help/seller-guide`, `/legal/*`, `/welcome`
2. **Phase 2 — Auth pages:** `/login` (verify UI), `/signup` (verify UI), `/forgot-password`, `/reset-password`
3. **Phase 3 — Login:** Execute login flow with test credentials
4. **Phase 4 — Dashboard:** `/dashboard`, `/dashboard/history`, `/dashboard/favorites`, `/dashboard/recently-viewed`, `/dashboard/analytics`, `/dashboard/collections`, `/dashboard/collections/[id]`
5. **Phase 5 — Problem flow:** `/problem/[id]` (detail), `/problem/[id]/solve`, `/problem/[id]/result/[sid]`, `/problem/[id]/history`, `/problem/[id]/print`
6. **Phase 6 — Seller pages:** `/sell`, `/sell/analytics`, `/sell/new`, `/sell/[id]/edit`, `/sell/[id]/rubric`, `/sell/[id]/submissions`, `/sell/[id]/announce`, `/sell/settings`, `/sell/coupons`, `/sell/payouts`, `/sell/transactions`, `/sell/pool`, `/sell/pool/new`, `/sell/pool/import`, `/sell/sets/new`
7. **Phase 7 — Settings:** `/settings/profile`, `/settings/billing`, `/settings/subscription`, `/settings/notifications`, `/settings/sessions`, `/settings/delete-account`, `/settings/seller`
8. **Phase 8 — Notifications:** `/notifications`
9. **Phase 9 — Admin (if accessible):** `/admin`, `/admin/users`, `/admin/sellers`, `/admin/reports`, `/admin/refunds`, `/admin/announcements`, `/admin/audit`, `/admin/revenue`
10. **Phase 10 — Error/404 pages:** Invalid URLs, segment-specific not-found triggers
11. **Phase 11 — Protected route redirects (fresh context):** Verify unauthenticated access to protected routes
12. **Phase 12 — Cross-cutting checks:** Responsive design, accessibility, console errors, performance

---

## Appendix C: Total Test Count Summary

| Section | Tests |
|---------|-------|
| Authentication flow | 17 |
| Public pages | 63 |
| Auth pages | 24 |
| Dashboard pages | 49 |
| Seller pages | 56 |
| Problem pages | 35 |
| Settings pages | 25 |
| Notifications | 9 |
| Admin pages | 22 |
| Help pages | 10 |
| Legal pages | 13 |
| Purchase flow | 10 |
| Error & Not-Found pages | 19 |
| Cross-cutting UX checks | 26 |
| **Total** | **378** |
