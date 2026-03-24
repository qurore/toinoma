# Playwright MCP Browser Test Specification

> **Document version:** 2.0
> **Created:** 2026-03-23 | **Revised:** 2026-03-24
> **Target:** Toinoma (toinoma.jp) — exhaustive UI/UX validation
> **Auth credentials:** Email `info@toinoma.jp` / PW `gpx7hjz0urw5aqe.TKZ`

---

## Core Testing Philosophy

**Every page test MUST follow these mandatory protocols. A page is NOT "tested" until ALL protocols have been executed.**

> "一つのページを開いて、そこから何もインタラクションせずに合格とするのではなく、一つ一つの触りえる要素全てを必ず操作して、操作感や、機能としての洗練さ、論理性をチェックすることが絶対に必要です。"

---

## Mandatory Test Protocols (Applied to EVERY Page)

### Protocol A: Rendering Integrity

After loading any page, scan ALL visible text for:

| Check | What to look for | Severity if found |
|-------|-------------------|-------------------|
| Escape sequences | Literal `\u00A5`, `\u00`, `\x`, `\n`, `\t` in displayed text | **HIGH** |
| Null/undefined | Words `undefined`, `null`, `NaN`, `[object Object]` | **HIGH** |
| Raw code | JSX syntax, template literals, HTML entities as text | **HIGH** |
| Placeholder text | "Lorem ipsum", "TODO", "Coming soon", "test" | **MEDIUM** |
| Encoding issues | Mojibake (文字化け), broken Unicode, garbled characters | **HIGH** |
| Empty content | Blank headings, empty labels, missing text in elements | **MEDIUM** |

**For every input element:** Read `placeholder` — must render as readable text, not escaped code.

### Protocol B: Navigation Link Verification

**Click EVERY link on the page** (sidebar, breadcrumbs, in-content, footer):

1. Click the link
2. Verify the target page loads (NOT 404, NOT error)
3. Navigate back to the original page
4. Verify the original page renders correctly
5. Record: source page, link text, target URL, result

**Any 404 or error → HIGH severity finding.**

### Protocol C: Exhaustive Input Interaction

**For EVERY input on the page**, perform these tests:

| Input Type | Tests |
|-----------|-------|
| **Text input** | Focus → verify placeholder renders correctly → type value → verify value displays → clear → verify reset |
| **Number input** | Type `1` (verify accepted) → type `50` → type `-1` (verify rejection/clamping) → type `1.5` (verify handling for integer fields like ¥) → use stepper arrows (verify increment) → type `999999999` (verify no UI break) → clear |
| **Dropdown/Select** | Open → verify all options present → select each option → verify selection registers and dependent UI updates |
| **Checkbox/Toggle** | Toggle ON → verify visual state → toggle OFF → verify reset → verify any triggered actions |
| **Radio/Rating** | Click each option → verify only one selected → verify triggered behavior |
| **Button** | Click → verify feedback (loading/toast/navigation/dialog) → verify text does NOT change during loading → verify disabled state when appropriate |

### Protocol D: Back-Navigation Round-Trip

After testing a page, perform at least 3 round-trips:

```
Page A → Click link → Page B → Back → Verify Page A state preserved
Page A → Click different link → Page C → Back → Verify Page A state preserved
Page A → Click another link → Page D → Back → Verify Page A state preserved
```

Verify: filters, form values, scroll position, selected tabs, URL parameters.

### Protocol E: Redundancy & Logic Check

| Check | Description | Severity |
|-------|-------------|----------|
| Duplicate controls | Same function in 2+ places (e.g., two sort dropdowns) | **MEDIUM** |
| Count mismatch | Filter count ≠ displayed results | **MEDIUM** |
| Sort not applied | First item doesn't match sort criteria | **MEDIUM** |
| URL/state mismatch | Selected filters don't match URL params | **MEDIUM** |
| Dead controls | Button/link does nothing when clicked | **HIGH** |

### Protocol F: Visual Coherence

| Check | Description | Severity |
|-------|-------------|----------|
| Icon density | >6 distinct icons in one section | **LOW** |
| Color inconsistency | Interactive elements using different accent colors | **LOW** |
| Spacing irregularity | Uneven card/form spacing | **LOW** |
| Missing empty state | Empty list with no guidance | **MEDIUM** |
| Perpetual loading | Spinner that never resolves | **HIGH** |

---

## Table of Contents

1. [Test Prerequisites](#1-test-prerequisites)
2. [Authentication Flow](#2-authentication-flow)
3. [Public Pages](#3-public-pages)
4. [Dashboard Pages](#5-dashboard-pages)
5. [Seller Pages](#6-seller-pages)
6. [Problem Pages](#7-problem-pages)
7. [Settings Pages](#8-settings-pages)
8. [Notifications](#9-notifications)
9. [Admin Pages](#10-admin-pages)
10. [Help & Legal Pages](#11-help--legal-pages)

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

- At least 1 published problem set (for `/problem/[id]`, `/explore`)
- At least 1 purchased problem set (for `/problem/[id]/solve`)
- At least 1 completed submission (for `/problem/[id]/result/[sid]`)
- At least 1 collection with items (for `/dashboard/collections/[id]`)
- Seller onboarding completed for test account (for `/seller/*`)
- At least 1 notification (for `/notifications`)

### 1.3 Dynamic ID Discovery

Before running dynamic-route tests, discover valid IDs:
- `PROBLEM_SET_ID`: Navigate to `/explore`, capture first problem set link href
- `SELLER_ID`: From problem detail page, capture seller profile link href
- `SUBMISSION_ID`: Navigate to `/dashboard/history`, capture first result link href
- `COLLECTION_ID`: Navigate to `/dashboard/collections`, capture first collection link href

---

## 2. Authentication Flow

### 2.1 Login via Email/Password

| # | Action | Expected | **Interaction** |
|---|--------|----------|-----------------|
| 1 | Navigate to `/login` | Page loads with login form | Apply Protocol A (rendering integrity) |
| 2 | **Click email input** | Input focuses, placeholder visible and readable | Protocol C: verify placeholder is human-readable |
| 3 | **Type email** `info@toinoma.jp` | Value appears in field | Verify displayed value matches typed value |
| 4 | **Click password input** | Input focuses | Protocol C |
| 5 | **Type password** `gpx7hjz0urw5aqe.TKZ` | Value masked with dots | Verify masking |
| 6 | **Click "ログイン" button** | Button shows spinner (icon swap, text "ログイン" unchanged, width unchanged) | Protocol C: verify button stability |
| 7 | Wait for redirect | Redirected to `/dashboard` | Verify URL |
| 8 | Verify auth state | AppNavbar shows user avatar, not "ログイン" | Take snapshot |
| 9 | **Protocol B**: Click each navbar link | Each link works, no 404 | Navigate back after each |
| 10 | **Protocol D**: Dashboard → `/explore` → back | Dashboard state preserved | Round-trip |

### 2.2 Auth Persistence

| # | Action | Expected |
|---|--------|----------|
| 1 | Navigate to `/settings/profile` | Loads without redirect to `/login` |
| 2 | Navigate to `/seller` | Loads without redirect to `/login` |
| 3 | Refresh page | Session persists |
| 4 | Navigate to `/dashboard` → `/explore` → back → `/seller` → back | All pages load, back-nav preserves state |

### 2.3 Protected Route Redirect (Unauthenticated)

| # | Action | Expected |
|---|--------|----------|
| 1 | Fresh context, navigate to `/dashboard` | Redirect to `/login?next=/dashboard` |
| 2 | Navigate to `/seller` | Redirect to `/login?next=/seller` |
| 3 | Navigate to `/settings/profile` | Redirect to `/login?next=/settings/profile` |
| 4 | Navigate to `/notifications` | Redirect to `/login?next=/notifications` |

---

## 3. Public Pages

### 3.1 Landing Page — `/`

**Protocols: A, B, C, D, E, F**

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/` | Page renders, no errors | A: scan for escape sequences |
| 2 | **Click each navbar link** (ホーム, 問題を探す, マイページ) | Each navigates correctly, no 404 | B: click → verify → back |
| 3 | **Click hero CTA button** | Navigates to target page | B |
| 4 | **Click each trending problem set card** | Navigates to `/problem/[id]` | B: click → verify → back |
| 5 | **Click each new arrival card** | Navigates correctly | B |
| 6 | **Click each subject category link** | Navigates to `/explore/[subject]` | B: click → verify → back |
| 7 | **Click bottom CTA button** | Navigates correctly | B |
| 8 | **Click each footer link** | All links work, no 404 | B |
| 9 | **Click search bar, type query** | Search navigates to `/explore?q=...` | C |
| 10 | Mobile viewport (375x667) | No horizontal overflow, all sections stack | F |
| 11 | Back-navigation: `/` → card → back | Landing state preserved | D |
| 12 | Back-navigation: `/` → subject → back | Landing state preserved | D |
| 13 | Back-navigation: `/` → footer link → back | Landing state preserved | D |

### 3.2 Explore Page — `/explore`

**Protocols: A, B, C, D, E, F — This is one of the most critical pages to test thoroughly.**

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| **Rendering** ||||
| 1 | Navigate to `/explore` | Page loads with heading and result grid | A |
| 2 | **Read ALL text on page** | No `\u00A5`, no `undefined`, no escape sequences | A |
| 3 | **Read price input placeholders** | Show `¥ 下限` and `¥ 上限` with actual ¥ character | A |
| **Subject filter** ||||
| 4 | **Check each subject checkbox** one by one | URL updates, results filter, count updates | C |
| 5 | **Uncheck each subject** | Filter removed, results update | C |
| 6 | Check 2+ subjects simultaneously | URL shows comma-separated, results include both | C |
| **Difficulty filter** ||||
| 7 | **Check each difficulty checkbox** | URL updates, results filter | C |
| 8 | Uncheck | Filter removed | C |
| **Free-only toggle** ||||
| 9 | **Toggle free-only ON** | URL adds `?free=1`, only ¥0 items shown, price inputs hidden | C |
| 10 | **Toggle free-only OFF** | Price inputs reappear | C |
| **Price range inputs** ||||
| 11 | **Click min price input** | Input focuses, placeholder `¥ 下限` visible as readable text | C |
| 12 | **Type `500`** | Value shows `500`, URL updates to `?price_min=500` | C |
| 13 | **Type `1` in min price** | Value `1` accepted (NOT rounded to 100) | C: verify step allows fine values |
| 14 | **Type `-1` in min price** | Rejected or clamped to 0 | C: negative test |
| 15 | **Type `1.5` in min price** | Handled correctly (integer-only for JPY) | C: decimal test |
| 16 | **Use stepper arrows on min price** | Increments by 1 (NOT by 100) | C: step test |
| 17 | **Repeat 11-16 for max price** | Same behavior | C |
| 18 | Set min > max | Verify logical handling | E |
| **Rating filter** ||||
| 19 | **Click each star (1-5)** | Star fills, URL updates, results filter | C |
| 20 | **Click active star again** | Rating clears (toggle behavior) | C |
| **Sort dropdown** ||||
| 21 | **Open sort dropdown** | All 5 options visible: 新着順, 人気順, 評価順, 価格安い順, 価格高い順 | C |
| 22 | **Select each option** | URL updates, results reorder accordingly | C |
| 23 | Verify first result matches sort criteria | Logical consistency | E |
| **Redundancy check** ||||
| 24 | **Count sort controls on page** | Exactly ONE sort dropdown visible (toolbar only, NOT also in sidebar) | E: duplicate check |
| **Pagination** ||||
| 25 | If >1 page, **click page 2** | URL adds `?page=2`, different results, page 2 highlighted | C |
| 26 | **Click "次へ" then "前へ"** | Navigation works correctly | C |
| **Active filter chips** ||||
| 27 | Apply filters, verify chip badges appear | Chips show active filters with × remove buttons | F |
| 28 | **Click × on each chip** | Filter removed, chip disappears | C |
| **Clear filters** ||||
| 29 | **Click "フィルターをクリア"** | All filters reset, URL back to `/explore` | C |
| **Cards** ||||
| 30 | **Click a problem set card** | Navigates to `/problem/[id]` | B |
| 31 | **Click heart icon on card** (logged in) | Heart fills/unfills, favorite toggled without reload | C |
| **Result count** ||||
| 32 | Verify "N件の問題セット" text | Count matches actual visible results | E |
| **Mobile** ||||
| 33 | Set viewport 375x667 | No overflow | F |
| 34 | **Tap filter button** | Mobile filter sheet opens | C |
| 35 | **Interact with all filters in mobile sheet** | Same behavior as desktop | C |
| **Back-navigation** ||||
| 36 | `/explore` → card click → back | Filter state preserved in URL | D |
| 37 | `/explore` → apply filters → card → back | Filters still applied | D |
| 38 | `/explore` → page 2 → card → back | Still on page 2 | D |

### 3.3 Subject Explore — `/explore/[subject]`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/explore/math` | h1 "数学の問題を探す" | A |
| 2 | Navigate to `/explore/invalid` | 404 page | — |
| 3 | **Test ALL 9 subjects** (`math`, `english`, `japanese`, `physics`, `chemistry`, `biology`, `japanese_history`, `world_history`, `geography`) | Each renders with correct label | A |
| 4 | **Apply difficulty filter** | Results filter correctly | C |
| 5 | **Click breadcrumb "探す"** | Navigates to `/explore` | B |
| 6 | `/explore/math` → apply filter → card → back | State preserved | D |

### 3.4 Rankings — `/rankings`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/rankings` | Trophy icon, h1, breadcrumbs | A |
| 2 | **Read all price values** | Show `¥` character, not `\u00A5` | A |
| 3 | **Click each tab** (購入数, 高評価) | Tab switches, results reorder | C |
| 4 | **Click each subject pill** | Results filter | C |
| 5 | **Click "すべて" pill** | Filter cleared | C |
| 6 | **Click a ranking card** | Navigates to `/problem/[id]` | B |
| 7 | `/rankings` → card → back | Tab and subject preserved | D |

### 3.5 Seller Profile — `/seller/[id]`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/seller/{SELLER_ID}` | Profile renders | A |
| 2 | **Click each navigation element** | All links work | B |
| 3 | **Click "出品者を報告"** | Report dialog opens | C |
| 4 | **Close dialog** | Dialog closes cleanly | C |
| 5 | `/seller/[id]` → problem card → back | Profile preserved | D |
| 6 | Navigate to `/seller/invalid-uuid` | 404 page | — |

---

## 4. Dashboard Pages (Auth Required)

> **Prerequisite:** Login first.

### 4.1 Dashboard Main — `/dashboard`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/dashboard` | Greeting or heading visible | A |
| 2 | **Click each stat card link** | Navigates to correct page | B: click → verify → back |
| 3 | **Click each sidebar nav link** | All links work, no 404 | B: one by one, back after each |
| 4 | **Click "解答する" buttons** | Navigate to `/problem/[id]/solve` | B |
| 5 | **Click "もっと見る" link** | Navigate to `/explore?subjects=...` | B |
| 6 | **Click recent purchase rows** | Navigate to `/problem/[id]` | B |
| 7 | **Click recent submission rows** | Navigate to `/problem/[id]/result/[sid]` | B |
| 8 | Verify stat card numbers | Non-negative, formatted correctly | E |
| 9 | `/dashboard` → sidebar link → back → different link → back | Dashboard state preserved | D |

### 4.2 Submission History — `/dashboard/history`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/dashboard/history` | Breadcrumbs, list visible | A |
| 2 | **Open subject filter dropdown** | All subjects listed | C |
| 3 | **Select a subject** | List filters | C |
| 4 | **Click a submission row** | Navigates to result page | B |
| 5 | Back from result → history | Filter state preserved | D |

### 4.3 Favorites — `/dashboard/favorites`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/dashboard/favorites` | Breadcrumbs, list visible | A |
| 2 | **Open subject filter** | Options present | C |
| 3 | **Click unfavorite button** | Item removed (optimistic) | C |
| 4 | **Click a favorite item** | Navigates to problem page | B |
| 5 | Back from problem → favorites | List state preserved | D |

### 4.4 Collections — `/dashboard/collections`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/dashboard/collections` | Collection list/grid | A |
| 2 | **Click create button** | Creation dialog opens | C |
| 3 | **Close dialog** | Closes cleanly | C |
| 4 | **Click a collection** | Navigates to detail page | B |
| 5 | Back from detail → list | List preserved | D |

### 4.5 Learning Analytics — `/dashboard/analytics`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/dashboard/analytics` | Breadcrumbs, heading | A |
| 2 | **Inspect stat cards** | Numbers formatted, non-negative | E |
| 3 | **Interact with chart controls** (if any) | Charts respond | C |
| 4 | Mobile viewport | Charts stack, readable | F |

---

## 5. Seller Pages (Auth + Seller Profile Required)

> **Prerequisite:** Login with seller-capable test account.

### 5.0 Seller Sidebar Link Verification (RUN FIRST)

**This is the most critical test for the seller section. Click EVERY sidebar link before deep-testing any page.**

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/seller` | Seller dashboard loads | A |
| 2 | **Click "ダッシュボード"** in sidebar | `/seller` loads, no 404 | B |
| 3 | **Back to `/seller`** | Dashboard preserved | D |
| 4 | **Click "問題プール"** in sidebar | `/seller/pool` loads, no 404 | B |
| 5 | **Back to `/seller`** | Dashboard preserved | D |
| 6 | **Click "問題セット"** in sidebar | `/seller/sets` loads, no 404 | B |
| 7 | **Back to `/seller`** | Dashboard preserved | D |
| 8 | **Click "分析"** in sidebar | `/seller/analytics` loads, no 404 | B |
| 9 | **Back to `/seller`** | Dashboard preserved | D |
| 10 | **Click "取引履歴"** in sidebar | `/seller/transactions` loads, no 404 | B |
| 11 | **Back to `/seller`** | Dashboard preserved | D |
| 12 | **Click "クーポン"** in sidebar | `/seller/coupons` loads, no 404 | B |
| 13 | **Back to `/seller`** | Dashboard preserved | D |
| 14 | **Click "振込・収益"** in sidebar | `/seller/payouts` loads, no 404 | B |
| 15 | **Back to `/seller`** | Dashboard preserved | D |
| 16 | **Click "設定"** in sidebar | `/seller/settings` loads, no 404 | B |
| 17 | **Back to `/seller`** | Dashboard preserved | D |
| 18 | Verify active sidebar item matches current page | Correct item highlighted on each page | E |

### 5.1 Seller Dashboard — `/seller`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Inspect stat cards | All numbers formatted, trend indicators visible | A, E |
| 2 | **Click each quick action button** | Navigate correctly | B |
| 3 | **Click edit on a problem set** | Navigate to edit page | B |
| 4 | **Click rubric link** | Navigate to rubric page | B |
| 5 | **Read all price values** | `¥` character, not `\u00A5` | A |
| 6 | `/seller` → edit → back → rubric → back | State preserved | D |

### 5.2 Problem Pool — `/seller/pool`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/seller/pool` | Breadcrumbs, question list | A |
| 2 | **Click "PDFインポート" button** | Navigate to `/seller/pool/import` | B |
| 3 | **Back** | Pool page preserved | D |
| 4 | **Click "問題を作成" button** | Navigate to `/seller/pool/new` | B |
| 5 | **Back** | Pool page preserved | D |
| 6 | **Open subject filter dropdown** | All subjects listed | C |
| 7 | **Select a subject** | List filters | C |
| 8 | **Open type filter dropdown** | All types listed | C |
| 9 | **Select a type** | List filters | C |
| 10 | **Type in search field** | Results filter | C |
| 11 | **Click a question** | Navigate to edit page | B |

### 5.3 Problem Sets — `/seller/sets`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/seller/sets` | Page loads (NOT 404), breadcrumbs visible | A |
| 2 | **Read subtitle** | Shows "N件 公開中 / M件 下書き" or "問題セットはまだありません" | A |
| 3 | **Click "新規作成" button** | Navigate to `/seller/sets/new` | B |
| 4 | **Back** | Sets page preserved | D |
| 5 | If sets exist: **click select-all checkbox** | All items selected | C |
| 6 | **Click bulk delete button** | Confirmation dialog opens | C |
| 7 | **Cancel dialog** | Dialog closes, no action taken | C |

### 5.4 Create/Edit Problem Set — `/seller/new`, `/seller/[id]/edit`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to form page | Form loads with fields | A |
| 2 | **Click title input, type title** | Value displays | C |
| 3 | **Open subject dropdown** | All 9 subjects listed | C |
| 4 | **Select each subject** | Selection registers | C |
| 5 | **Open difficulty dropdown** | All options listed | C |
| 6 | **Click price input, type price** | Value accepted | C |
| 7 | **Type `1` in price** | Accepted (not rounded to 100) | C: step test |
| 8 | **Type `-1` in price** | Rejected/clamped to 0 | C: negative test |
| 9 | **Submit empty form** | Validation errors shown | C |
| 10 | **Submit valid form** | Success, redirect | C |

### 5.5 Analytics — `/seller/analytics`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/seller/analytics` | Charts/data visible | A |
| 2 | **Interact with period selector** (if any) | Chart updates | C |
| 3 | **Read revenue values** | `¥` character, not `\u00A5` | A |

### 5.6 Other Seller Pages

For `/seller/transactions`, `/seller/coupons`, `/seller/payouts`, `/seller/settings`:

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to page | Page loads, no 404 | A |
| 2 | **Read all text** | No escape sequences, no `undefined` | A |
| 3 | **Interact with every input/button/dropdown** | All respond correctly | C |
| 4 | **Click every link** | All work, no 404 | B |
| 5 | Back-navigation | State preserved | D |

---

## 6. Problem Pages

### 6.1 Problem Detail — `/problem/[id]`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/problem/{PROBLEM_SET_ID}` | Full detail page | A |
| 2 | **Read price display** | `¥` character or "無料", not `\u00A5` | A |
| 3 | **Click each tab** (Description, Samples, Reviews, Q&A) | Content changes per tab | C |
| 4 | **Click seller profile link** | Navigate to `/seller/[id]` | B |
| 5 | **Back** | Problem page preserved, same tab active | D |
| 6 | **Click purchase/solve button** | Appropriate action | C |
| 7 | **Click "コレクションに追加" button** | Dialog opens | C |
| 8 | **Close dialog** | Clean close | C |
| 9 | **Click share button** | Share options appear | C |
| 10 | **Click report button** | Report dialog opens | C |
| 11 | **Click related problem card** | Navigate, then back | B, D |
| 12 | Mobile viewport | Responsive, no overflow | F |

### 6.2 Solve — `/problem/[id]/solve`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate (must be purchased) | Solve interface loads | A |
| 2 | **Type in each answer field** | Input accepted per type (essay: textarea, fill-in: text, mark-sheet: radio/checkbox) | C |
| 3 | **Navigate between sections** | Section tabs work | C |
| 4 | **Click exit/back** | Confirmation if unsaved answers | C |
| 5 | **Submit answers** | Loading state, redirect to result | C |

### 6.3 Result — `/problem/[id]/result/[sid]`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to result page | Score, feedback visible | A |
| 2 | **Read all scores** | Formatted numbers, no NaN/undefined | A |
| 3 | **Click retry button** | Navigate to solve page | B |
| 4 | **Back** | Result preserved | D |
| 5 | **Click history link** | Navigate to history page | B |

---

## 7. Settings Pages (Auth Required)

### 7.0 Settings Sidebar Link Verification

| # | Action | Expected |
|---|--------|----------|
| 1 | Navigate to `/settings` | Redirect to `/settings/profile` |
| 2 | **Click each settings sidebar link** one by one | All load, no 404, back preserves state |

### 7.1 Profile — `/settings/profile`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/settings/profile` | Profile form visible | A |
| 2 | **Click display name input** | Focus, current value shown | C |
| 3 | **Clear and type new name** | Value updates | C |
| 4 | **Click subject multi-select** | Options available | C |
| 5 | **Select/deselect subjects** | Multi-select works | C |
| 6 | **Click save** | Success toast | C |
| 7 | **Submit empty display name** | Validation error | C |

### 7.2 Subscription — `/settings/subscription`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/settings/subscription` | Plan cards visible | A |
| 2 | **Read all prices** | `¥` character, correct amounts | A |
| 3 | **Toggle annual/monthly** | Prices update | C |
| 4 | **Verify plan card content** | Feature matrix, current plan highlighted | E |
| 5 | **Click subscribe button** | Redirect to Stripe or appropriate action | C |

### 7.3 Other Settings

For `/settings/billing`, `/settings/notifications`, `/settings/sessions`, `/settings/delete-account`, `/settings/seller`:

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to page | Page loads | A |
| 2 | **Interact with every input/toggle/button** | All respond | C |
| 3 | **Read all text** | No escape sequences | A |
| 4 | Back-navigation | State preserved | D |

---

## 8. Notifications — `/notifications`

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to `/notifications` | List loads | A |
| 2 | **Click each type filter tab** | List filters, URL updates | C |
| 3 | **Click a notification** | Marked as read, navigates | B |
| 4 | **Back** | Filter state preserved | D |
| 5 | **Verify pagination** (if >20) | Page controls work | C |

---

## 9. Admin Pages (Auth + Admin Required)

For `/admin`, `/admin/users`, `/admin/sellers`, `/admin/reports`, `/admin/refunds`, `/admin/announcements`, `/admin/revenue`:

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to page | Admin dashboard or access denied | A |
| 2 | **Read all monetary values** | `¥` character, not `\u00A5` | A |
| 3 | **Click each admin sidebar link** | All load, no 404 | B: click → verify → back |
| 4 | **Interact with filters/search** | All respond | C |
| 5 | **Click table rows** | Navigate to detail | B |
| 6 | Back-navigation | State preserved | D |

---

## 10. Help & Legal Pages

For `/help`, `/help/[slug]`, `/legal/terms`, `/legal/privacy`, `/legal/specified-commercial-transactions`:

| # | Action | Expected | Protocol |
|---|--------|----------|----------|
| 1 | Navigate to page | Content renders | A |
| 2 | **Click all in-page links** | Navigate correctly | B |
| 3 | **Read all text** | No placeholder content, no escape sequences | A |
| 4 | Back-navigation | State preserved | D |

---

## 11. Error & Edge Cases

| # | Action | Expected |
|---|--------|----------|
| 1 | Navigate to `/nonexistent-page` | Custom 404 page renders |
| 2 | Navigate to `/problem/invalid-uuid` | 404 or error page |
| 3 | Navigate to `/dashboard/collections/invalid` | 404 or error page |
| 4 | Navigate to `/seller/invalid-uuid` | 404 or error page |
| 5 | Navigate to `/explore?subject=invalid` | Graceful handling (ignore invalid, show all) |
| 6 | Navigate to `/explore?page=999999` | Last page shown or empty state |

---

## 12. Cross-Cutting Verification Checklist

At the END of all page tests, verify these cross-cutting concerns:

| # | Check | How |
|---|-------|-----|
| 1 | **No `\u00A5` anywhere** | Search all page text for literal escape sequences |
| 2 | **All nav links work** | Every sidebar/header link was clicked and verified |
| 3 | **All price inputs accept step=1** | Typed `1` into every price input |
| 4 | **No duplicate controls** | Verified each page has unique controls |
| 5 | **Back button works everywhere** | Performed round-trip on every page |
| 6 | **Empty states are helpful** | Every empty list has guidance text |
| 7 | **Button text stability** | No button changed text during loading |
| 8 | **Mobile responsive** | Key pages tested at 375x667 |
