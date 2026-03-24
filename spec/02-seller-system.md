# Seller System — Detailed Specification

> **Features:** SLR-001 through SLR-024 | **Priority:** Mostly P0-P1

## 1. Overview

The seller system enables any authenticated user to become a problem creator (seller). This follows the **Udemy instructor model**: a prominent "seller mode" toggle in the navbar grants access to the seller dashboard. Access requires acceptance of seller-specific Terms of Service. Full publishing capability (paid content) additionally requires Stripe Connect onboarding.

## 2. Seller Mode Toggle (SLR-001)

### Description
A prominent button in the main navigation bar, visible to ALL authenticated users (not just existing sellers). Clicking it navigates to `/seller`.

### UI Specification
- **Location:** Right side of navbar, before the user avatar/dropdown
- **Desktop:** Text button with icon: `Store` icon + "出品者モード" label
- **Mobile:** Icon-only button in the mobile bottom nav or navbar
- **Style:** `variant="ghost"` with subtle border or background to distinguish from regular nav items
- **State:** Always visible when authenticated. No conditional rendering.
- **Behavior:** `<Link href="/seller">` — simple navigation

### Reference: Udemy's Instructor Toggle
Udemy shows "Instructor" as a text link in the header for all logged-in users. Clicking it takes you to the instructor dashboard. If you're not yet an instructor, Udemy shows an onboarding page. Toinoma mirrors this but gates on ToS acceptance instead of onboarding.

### Acceptance Criteria
- [ ] Button visible in navbar for all authenticated users
- [ ] Button NOT visible for unauthenticated visitors
- [ ] Clicking button navigates to `/seller`
- [ ] Button uses Store icon + "出品者モード" text (desktop)
- [ ] Button is icon-only on mobile (< md breakpoint)
- [ ] Button styled distinctly from regular nav items (not same as nav links)

---

## 3. Seller ToS Acceptance Modal (SLR-002)

### Description
When a user navigates to `/seller` without having accepted the seller Terms of Service, a non-dismissable modal dialog appears. The user must read the ToS, check a confirmation checkbox, and click "Accept" to proceed. This creates or updates the `seller_profiles` record with `tos_accepted_at`.

### UI Specification
- **Modal type:** `Dialog` (Radix) with `modal={true}` — no click-outside dismiss, no Escape key dismiss
- **No close button (X)** — the only way to proceed is to accept or navigate away (browser back)
- **Width:** `max-w-lg` (512px)
- **Content:**
  1. Title: "出品者利用規約" (Seller terms of service)
  2. Scrollable ToS content area (max-height: 300px, overflow-y: scroll)
  3. Checkbox: "上記の利用規約に同意します" (I agree to the above terms of service)
  4. Accept button: "同意して始める" (Agree and get started) — disabled until checkbox checked
  5. Cancel link: "戻る" (Go back) — navigates to `/dashboard`
- **Loading state:** Button shows spinner icon while processing (text stays fixed per CLAUDE.md button stability rule)

### ToS Content
The modal embeds the ToS content inline (not a link to a separate page). Content covers:
- Seller responsibilities (originality, accuracy, copyright compliance)
- Platform fee structure (15%)
- Content policy (no real exam copying)
- Revenue sharing and payout terms
- Content removal and dispute resolution
- Liability limitations

### Server Action
```typescript
// Reuse existing acceptTos() or create acceptSellerTos()
// Creates seller_profiles record with:
//   id: user.id
//   seller_display_name: "__pending__"
//   tos_accepted_at: new Date().toISOString()
// After success: revalidatePath("/seller") + redirect to /seller
```

### Acceptance Criteria
- [ ] Modal appears when navigating to `/seller` without ToS acceptance
- [ ] Modal is non-dismissable (no X, no click-outside, no Escape)
- [ ] ToS content is scrollable within the modal
- [ ] Checkbox must be checked before accept button is enabled
- [ ] Accept button calls server action to store `tos_accepted_at`
- [ ] After acceptance, modal closes and seller dashboard is displayed
- [ ] "Go back" link navigates to `/dashboard`
- [ ] Button text remains fixed during loading (icon changes to spinner)

---

## 4. Seller ToS Redirect Gate (SLR-003)

### Description
All seller sub-routes (`/seller/new`, `/seller/[id]/edit`, `/seller/[id]/rubric`, `/seller/analytics`, etc.) redirect to `/seller` if the user has not accepted the seller ToS. The `/seller` page itself does NOT redirect — it shows the ToS modal instead.

### Implementation
- **Layout level:** `(seller)/layout.tsx` checks auth only (redirects to `/login` if not authenticated)
- **Page level:** Each seller sub-page calls `requireSellerTos()` which redirects to `/seller` if no ToS
- **`/seller` page:** Checks ToS status server-side and passes boolean to client component that renders the modal

### New Auth Utility
```typescript
// lib/auth/require-seller.ts
export async function requireSellerTos() {
  // Returns { user, tosAccepted, sellerProfile }
  // Redirects to /seller if tosAccepted === false
  // Does NOT require full seller completion (Stripe)
}

// Keep existing requireCompleteSeller() for publish-gated actions
```

### Acceptance Criteria
- [ ] Unauthenticated users on any `/seller/*` route → redirect to `/login`
- [ ] Authenticated users without ToS on `/seller/new` → redirect to `/seller`
- [ ] Authenticated users without ToS on `/seller/[id]/edit` → redirect to `/seller`
- [ ] Authenticated users without ToS on `/seller/analytics` → redirect to `/seller`
- [ ] Authenticated users without ToS on `/seller` → show ToS modal (no redirect)
- [ ] Authenticated users WITH ToS → all seller routes accessible
- [ ] `/seller/onboarding` skips Step 1 (ToS) if already accepted

---

## 5. Seller Profile Creation (SLR-004)

### Description
After ToS acceptance, the seller profile is partially created (`seller_display_name: "__pending__"`). Full profile requires: display name, description, university, circle name. This is prompted via a banner on the seller dashboard or via the onboarding flow.

### Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| seller_display_name | text | Yes | 1-50 chars |
| seller_description | text | No | Max 500 chars |
| university | text | No | Max 100 chars |
| circle_name | text | No | Max 100 chars |

### Acceptance Criteria
- [ ] Profile form validates all fields via Zod schema
- [ ] Display name is required (min 1, max 50 chars)
- [ ] Profile saved to `seller_profiles` table
- [ ] After saving, seller can proceed to Stripe onboarding or start creating content

---

## 6. Stripe Connect Onboarding (SLR-005)

### Description
Sellers must complete Stripe Connect onboarding to receive payouts for paid problem sets. This creates a Stripe Express account with identity verification. Required before publishing paid content (free content can be published without Stripe).

### Flow
1. Seller clicks "Set up payouts" on dashboard
2. Server creates Stripe Connect account (or retrieves existing)
3. Server generates account link (onboarding URL)
4. Redirect to Stripe onboarding
5. On return: verify account status
6. If complete: `stripe_account_id` saved to `seller_profiles`

### Acceptance Criteria
- [ ] "Set up payouts" button on seller dashboard and onboarding
- [ ] Stripe Express account created with `country: "JP"`, `type: "express"`
- [ ] Redirect to Stripe onboarding URL
- [ ] Handle return URL with success/refresh cases
- [ ] Store `stripe_account_id` in `seller_profiles`
- [ ] Verify account `charges_enabled` and `payouts_enabled` status
- [ ] Allow publishing free content without Stripe
- [ ] Block publishing paid content without completed Stripe

---

## 7. Seller Dashboard Overview (SLR-006)

### Description
The main seller dashboard at `/seller`. Shows key metrics, recent activity, and quick actions.

### UI Layout
```
┌─────────────────────────────────────────────────┐
│ AppNavbar                                       │
├─────────────────────────────────────────────────┤
│ [Onboarding Banner - if incomplete]             │
├────────┬────────┬────────┬──────────────────────┤
│ Total  │ Publis │ Draft  │ Revenue    │ Students│
│ Sets   │ -hed   │        │ ¥XX,XXX   │ XXX     │
├────────┴────────┴────────┴──────────────────────┤
│ Quick Actions                                    │
│ [+ New Problem Set] [Import from PDF] [Pool]    │
├─────────────────────────────────────────────────┤
│ Recent Problem Sets                              │
│ ┌──────────────────────────────────────────┐    │
│ │ Title | Subject | Difficulty | Status    │    │
│ │ ...   | ...     | ...        | Published │    │
│ └──────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│ Recent Submissions                               │
│ [Student X scored 85/100 on Set Y - 2h ago]     │
└─────────────────────────────────────────────────┘
```

### Stats Cards
| Card | Data Source | Format |
|------|------------|--------|
| Total sets | COUNT problem_sets WHERE seller_id = user.id | Number |
| Published | COUNT problem_sets WHERE status = 'published' | Number (green) |
| Drafts | COUNT problem_sets WHERE status = 'draft' | Number (muted) |
| Revenue | SUM purchases.amount_paid for seller's sets | ¥XX,XXX |
| Students | COUNT DISTINCT purchases.user_id for seller's sets | Number |

### Onboarding Completion Banner
If seller profile is incomplete (`seller_display_name = "__pending__"` or `stripe_account_id IS NULL`):
- Yellow banner: "プロフィールを完成させて、出品を始めましょう"
- Steps indicator: ✅ ToS → ⬜ Profile → ⬜ Stripe
- CTA: "プロフィールを設定" or "支払い設定を完了"

### Acceptance Criteria
- [ ] Dashboard displays 5 stat cards
- [ ] Stats fetched server-side (Server Component)
- [ ] Onboarding banner shown when profile/Stripe incomplete
- [ ] Quick action buttons link to correct pages
- [ ] Recent problem sets list with status badges
- [ ] Recent submissions (if any) with student name/score
- [ ] Empty states for new sellers (no sets, no submissions)

---

## 8. Problem Set Management List (SLR-007)

### Description
Full list of seller's problem sets with management actions.

### Features
- Table view (desktop) / Card view (mobile)
- Columns: Title, Subject, Difficulty, Questions, Price, Status, Last Updated
- Actions per row: Edit, Rubric, Submissions, Publish/Unpublish, Delete
- Filter by status (all, published, draft)
- Sort by date, title, price
- Search within own sets

### Acceptance Criteria
- [ ] Lists all seller's problem sets
- [ ] Responsive: table on desktop, cards on mobile
- [ ] Filter by status works
- [ ] Sort options work
- [ ] Edit links to `/seller/[id]/edit`
- [ ] Delete requires confirmation dialog
- [ ] Publish validates completeness before allowing
- [ ] Pagination for > 20 sets

---

## 9. Revenue Dashboard (SLR-008)

### Description
`/seller/analytics` — comprehensive revenue and sales analytics.

### Visualizations
1. **Revenue over time:** Line chart (daily/weekly/monthly toggle)
2. **Sales by problem set:** Bar chart, top 10 sets
3. **Revenue by subject:** Pie/donut chart
4. **Key metrics:** Total revenue, this month's revenue, average per set, conversion rate

### Data Sources
- `purchases` table joined with `problem_sets` for seller's sets
- Aggregations computed server-side

### Acceptance Criteria
- [ ] Revenue line chart with time period selector
- [ ] Per-set revenue breakdown
- [ ] Subject distribution chart
- [ ] Key metric cards
- [ ] Date range filter
- [ ] CSV export option

---

## 10. Seller Public Profile (SLR-012)

### Description
`/seller/[id]` — public-facing seller profile page visible to all users.

### Content
- Seller avatar, display name, university, circle name
- Bio/description
- Verification badge (if verified)
- Seller tier badge (Bronze/Silver/Gold/Platinum)
- Statistics: total problem sets, total students, average rating
- Published problem sets grid
- Reviews summary

### Acceptance Criteria
- [ ] Public page, no auth required
- [ ] Shows all published problem sets by this seller
- [ ] Shows aggregate rating across all sets
- [ ] "Follow" or "View all sets" CTA
- [ ] SEO optimized (meta tags, OGP)

---

## 11. Database Schema

### seller_profiles (existing, no changes needed)
```sql
CREATE TABLE seller_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id),
  seller_display_name TEXT NOT NULL,
  seller_description TEXT,
  university TEXT,
  circle_name TEXT,
  tos_accepted_at TIMESTAMPTZ,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Seller capability levels
| Level | Condition | Can do |
|-------|-----------|--------|
| Visitor | No seller_profiles record | Browse seller dashboard (with ToS modal) |
| ToS Accepted | tos_accepted_at IS NOT NULL | Access seller dashboard, create questions, create free problem sets |
| Profile Complete | seller_display_name != "__pending__" | All above + profile visible |
| Fully Onboarded | stripe_account_id IS NOT NULL | All above + publish paid content, receive payouts |

---

## 12. Route Structure

```
/seller                          Seller dashboard (ToS modal if not accepted)
/seller/pool                     Problem pool management
/seller/pool/new                 Create new question
/seller/pool/[qid]/edit          Edit question
/seller/sets/new                 Compose new problem set from pool
/seller/[id]/edit                Edit problem set metadata
/seller/[id]/rubric              Edit rubrics for set's questions
/seller/[id]/submissions         View submissions for this set
/seller/analytics                Revenue and sales analytics
/seller/payouts                  Payout history
/seller/settings                 Seller-specific settings
/seller/onboarding               Complete onboarding (profile + Stripe)

/seller/[id]                   Public seller profile page
/legal/seller-tos              Full seller ToS document
```
