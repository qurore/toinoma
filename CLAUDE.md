# Toinoma (問の間) — AI-Graded Exam Problem Marketplace

> **Site Name:** Toinoma (問の間 — "Space of Questions")
> **Domain:** toinoma.jp
> **Tagline:** Where questions meet answers.

---

## Project Overview

Toinoma is a marketplace platform that connects university student exam-problem creators with students preparing for entrance exams. It integrates a **problem marketplace** with **AI-powered auto-grading** via Vercel AI SDK + Google Generative AI, delivering clear value to both creators (problem authors) and students.

### Core Value Proposition

| Problem | Current State | Toinoma's Solution |
|---------|--------------|-------------------|
| Discoverability | Each circle sells on independent sites | Unified marketplace with search and discovery |
| Purchase Experience | Generic platforms (BOOTH), not exam-focused | Exam-specialized UI with subject/difficulty filters |
| Grading | Self-grading only, checking against solution PDFs | AI grading based on creator-defined rubrics |
| Feedback | None | AI-generated partial credit explanations and improvement advice |
| Creator Monetization | Limited to school festival sales | Continuous sales channel + grading analytics |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Monorepo** | pnpm + Turborepo | Workspace management, task orchestration, caching |
| **Web** | Next.js 15 (App Router) | Full-stack React with Server Components, Server Actions, API routes |
| **Mobile** | Expo (React Native) + Expo Router | iOS/Android with camera-based answer capture (Phase 6) |
| **Language** | TypeScript | Type-safe development across all packages |
| **Styling** | Tailwind CSS + custom design tokens | Utility-first CSS (web) |
| **UI Components** | Radix UI + custom components | Accessible, unstyled primitives with custom design system (web) |
| **Database** | Supabase (PostgreSQL) | Direct client, no ORM. SQL migrations via `supabase migration` |
| **Auth** | Supabase Auth | OAuth 2.0 (Google, X/Twitter). Single user type; seller capability is additive. |
| **Payment** | Stripe Connect (Express accounts) | Creator payouts with identity verification |
| **Storage** | Supabase Storage | Problem PDFs, images, handwritten answer uploads |
| **AI Grading** | Vercel AI SDK + Google Generative AI provider | Auto-grading based on creator-defined rubrics |
| **Deploy** | Vercel (web), App Store / Google Play (mobile) | Production hosting |

### Key Design Decisions

1. **No ORM (No Prisma)** — Use Supabase client directly with generated types. SQL migrations managed via `supabase migration`.
2. **Server-First Rendering** — Default to Server Components; use `"use client"` only for interactivity.
3. **Supabase Storage** — Unified with the database layer. No separate S3/R2 setup needed.
4. **Row-Level Security (RLS)** — All data access governed by Supabase RLS policies. No middleware-based auth checks for data.
5. **Lazy Stripe Initialization** — Stripe client initializes at runtime to allow builds without secrets.
6. **pnpm + Turborepo Monorepo** — Shared types, schemas, constants between web and mobile. Raw TypeScript in `packages/shared` (no build step).
7. **Mobile calls web API routes** — Both platforms use the same `/api/*` endpoints. No separate backend for mobile.
8. **Unified User Model with Additive Seller Role** — No `role` enum on `profiles`. All users can browse and purchase. Seller capability is additive: users opt into selling by completing seller onboarding (seller ToS acceptance + seller profile creation + Stripe Connect). Seller state is derived from the existence of a `seller_profiles` record, not a role field.

---

## Project Structure (pnpm + Turborepo Monorepo)

```
apps/
├── web/                             # Next.js 15 (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css          # Tailwind v4 @import + @theme design tokens
│   │   │   ├── layout.tsx           # Root layout (lang="ja", Inter font)
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── (marketing)/         # Public pages (landing, explore)
│   │   │   ├── (dashboard)/         # Authenticated user routes (purchases, history, favorites)
│   │   │   ├── (seller)/            # Seller routes (requires seller_profiles record)
│   │   │   ├── api/                 # API routes (webhooks, ai-grading)
│   │   │   └── auth/callback/       # Supabase Auth callback
│   │   ├── components/
│   │   │   ├── ui/                  # Radix-based primitives (Button, etc.)
│   │   │   ├── marketplace/         # Problem cards, filters, search
│   │   │   ├── grading/             # Answer input, result display
│   │   │   └── dashboard/           # Charts, stats, tables
│   │   ├── lib/
│   │   │   ├── utils.ts             # cn() — clsx + tailwind-merge
│   │   │   ├── supabase/            # Browser/Server/Middleware clients
│   │   │   ├── stripe.ts            # Stripe Connect logic (lazy singleton)
│   │   │   └── ai/grading.ts        # Vercel AI SDK + Google Generative AI
│   │   ├── types/database.ts        # Re-exports from @toinoma/shared
│   │   ├── test/setup.ts            # Vitest setup
│   │   └── middleware.ts            # Route protection (calls updateSession)
│   ├── e2e/                         # Playwright E2E tests
│   └── .env.example                 # Environment variable template
│
└── mobile/                          # Expo (React Native) — Phase 6
    ├── app/index.tsx                # Validation fixture
    └── app.json                     # Expo config

packages/
└── shared/                          # Shared between web and mobile
    └── src/
        ├── types/                   # Supabase generated types (database.ts)
        ├── schemas/                 # Zod schemas (grading result)
        ├── constants/               # Subjects, difficulties, labels
        └── utils/                   # Fee calculation, score formatting

supabase/                            # Single source of truth for DB
├── config.toml
├── migrations/
└── seed.sql

turbo.json                           # Turborepo task pipeline
pnpm-workspace.yaml                  # Workspace definition
tsconfig.base.json                   # Shared TypeScript config
```

---

## Page Structure & Routing

```
/                           Top page (featured, new arrivals, rankings)
/explore                    Browse problems (filters: subject, university, difficulty, price)
/problem/[id]               Problem detail page (preview, purchase button)
/problem/[id]/solve         Answer submission page (purchased only)
/problem/[id]/result/[sid]  Grading result page

/auth/callback              Supabase Auth OAuth callback
/login                      Sign in (Google, X/Twitter)

/dashboard                  User dashboard (purchases, performance trends)
/dashboard/history          Submission history
/dashboard/favorites        Saved problems

/sell                       Seller dashboard (requires seller_profiles)
/sell/new                   Create new problem set
/sell/[id]/edit             Edit problem set
/sell/[id]/rubric           Rubric editor
/sell/analytics             Sales analytics
/sell/onboarding            Seller onboarding (ToS → profile → Stripe Connect)

/settings                   Account settings
```

---

## Database Design

### Tables

- **profiles** — Extends Supabase Auth users (display_name, avatar_url). No role field. All authenticated users can browse and purchase.
- **seller_profiles** — Seller-specific data (seller_display_name, seller_description, university, circle_name, tos_accepted_at, stripe_account_id). Existence of this record = user has seller capability. Created upon completing seller onboarding.
- **problem_sets** — Seller-published exam problems (subject, university, difficulty, price, rubric JSONB, PDF URLs). FK to seller_profiles.
- **purchases** — User purchases (unique per user+problem_set)
- **submissions** — User answer submissions with AI grading results (answers JSONB, score, feedback JSONB)
- **favorites** — User wishlists

### User Model

```
All users (profiles)
  ├── Can browse, purchase, submit answers, manage favorites
  └── Optionally: complete seller onboarding
        ├── Step 1: Accept seller Terms of Service
        ├── Step 2: Create seller profile (display name, description, etc.)
        └── Step 3: Complete Stripe Connect onboarding
        → seller_profiles record created → can publish and sell problem sets
```

**Seller capability check:** `seller_profiles` record exists with `tos_accepted_at IS NOT NULL` AND `stripe_account_id IS NOT NULL`.

### Subjects

`math`, `english`, `japanese`, `physics`, `chemistry`, `biology`, `japanese_history`, `world_history`, `geography`

### RLS Policies

- Profiles: Public read, self-update only
- Seller profiles: Public read, self-update only, self-create only
- Problem sets: Published visible to all, drafts visible to owning seller only, CRUD restricted to owning seller
- Purchases: Self-read, self-create only
- Submissions: Self-read/create, sellers can view submissions for their own problem sets
- Favorites: Self-manage only

---

## AI Grading Design

### Rubric Structure

Creators define rubrics per section/sub-question as JSONB:

```json
{
  "sections": [{
    "number": 1,
    "points": 30,
    "questions": [{
      "number": "(1)",
      "points": 10,
      "type": "essay",
      "rubric": [
        { "element": "Reference to Treaty of Westphalia", "points": 3 },
        { "element": "Explanation of sovereign state system formation", "points": 4 },
        { "element": "Logical coherence of writing", "points": 3 }
      ],
      "modelAnswer": "..."
    }]
  }]
}
```

### Grading Principles

- Embed creator-defined rubric in the System Prompt
- Explicitly instruct partial credit logic
- Math: LaTeX parsing + step-by-step verification
- Essay: Element presence check + logical coherence evaluation
- Handwritten images: Claude Vision for direct image analysis

---

## Payment Design (Stripe Connect)

```
Purchase Flow:
  User -> Stripe Checkout -> Payment Complete
    ├── Platform fee: 15%
    ├── Stripe fee: 3.6% + ¥40 (Japan)
    └── Seller payout: remaining (via Stripe Connect Express)
```

- Free problems (¥0) skip Stripe checkout
- Stripe Connect onboarding is part of the seller onboarding flow (Step 3 of 3)

---

## Feature Domain Tree

> **Version:** 1.0 | **Status:** Active | **Total Features:** 38 (2 PRE + 36 FR)
> **Build Order:** Prerequisites → Foundation → Authoring & Grading → Commerce & Analytics → Study Tools

### Prerequisites (Iteration 0)

- **PRE-001** Database schema alignment | prerequisite | iter:0 | P1 | deps: none
- **PRE-002** Route group rename | prerequisite | iter:0 | P1 | deps: none

### D1 — Design System

#### Visual Foundation

- **FR-001** Theme colors (bright blue-green) | explicit | iter:1 | P1 | deps: none
- **FR-002** Design token foundation | inferred | iter:1 | P1 | deps: FR-001

### D2 — Answer Type System

#### Type Definitions

- **FR-003** Polymorphic answer type definition | explicit | iter:1 | P1 | deps: PRE-001
- **FR-009** Rubric schema v2 (polymorphic) | inferred | iter:1 | P1 | deps: FR-003

#### Grading Logic

- **FR-004** Essay partial credit AI grading | explicit | iter:2 | P1 | deps: FR-009
- **FR-005** Mark-sheet grouped scoring | explicit | iter:2 | P1 | deps: FR-009 [OC]
- **FR-006** Mark-sheet choice set config | explicit | iter:2 | P2 | deps: FR-005
- **FR-007** Fill-in-the-blank exact match | explicit | iter:2 | P1 | deps: FR-009
- **FR-010** Grading engine dispatch | inferred | iter:2 | P1 | deps: FR-004, FR-005, FR-007

#### Input Components

- **FR-008** Answer input components per type | inferred | iter:2 | P1 | deps: FR-003, FR-002

### D3 — Seller Model & Governance

#### Onboarding

- **FR-013** Seller ToS acceptance | explicit | iter:1 | P1 | deps: PRE-001
- **FR-015** Seller profile extended data | explicit | iter:1 | P1 | deps: PRE-001
- **FR-018** Stripe Connect onboarding | inferred | iter:1 | P1 | deps: FR-013, FR-015

#### Publishing

- **FR-011** Free publishing path | explicit | iter:2 | P1 | deps: FR-018
- **FR-012** Paid publishing path | explicit | iter:2 | P1 | deps: FR-018
- **FR-016** Publishing rate limiter | explicit | iter:2 | P2 | deps: FR-011
- **FR-017** Originality attestation | explicit | iter:2 | P2 | deps: FR-011

#### Analytics

- **FR-014** Revenue dashboard | explicit | iter:3 | P2 | deps: FR-012

### D4 — Problem Authoring

#### Core Editor

- **FR-019** Problem creation interface | explicit | iter:2 | P1 | deps: FR-009, FR-002
- **FR-020** Essay question via photo upload | explicit | iter:2 | P1 | deps: FR-019 [OC]
- **FR-021** Structured upload format (mark-sheet/fill-in) | explicit | iter:2 | P1 | deps: FR-019

#### Layout & Export

- **FR-022** A4 page layout with page breaks | explicit | iter:3 | P2 | deps: FR-019
- **FR-023** Margin options (narrow/normal) | explicit | iter:3 | P2 | deps: FR-022
- **FR-024** PDF download | explicit | iter:3 | P2 | deps: FR-022

#### Mobile

- **FR-025** Mobile upload support | explicit | iter:2 | P1 | deps: FR-020

### D5 — Subscription & Billing

#### Tier Design

- **FR-026** Two subscription tiers (500/2000 JPY) | explicit | iter:3 | P1 | deps: PRE-001
- **FR-027** Annual subscription pricing | explicit | iter:3 | P1 | deps: FR-026 [OC]

#### Stripe Integration

- **FR-028** Stripe Billing integration | inferred | iter:3 | P1 | deps: FR-026
- **FR-029** Subscription management UI | inferred | iter:3 | P1 | deps: FR-028, FR-002
- **FR-032** Stripe subscription webhooks | inferred | iter:3 | P1 | deps: FR-028

#### Usage & Metering

- **FR-030** Subscription status middleware | inferred | iter:3 | P1 | deps: FR-028
- **FR-031** Token usage tracking | explicit | iter:3 | P2 | deps: FR-030, FR-010
- **FR-033** AI study assistance (DEFERRED) | explicit | iter:4 | P3 | deps: FR-031

### D6 — Study Tools & Collections

#### Collections

- **FR-034** Custom collections data model | inferred | iter:4 | P2 | deps: PRE-001
- **FR-035** Problem set aggregation | explicit | iter:4 | P2 | deps: FR-034
- **FR-036** Problem shuffle within collections | explicit | iter:4 | P2 | deps: FR-034

### Dependency Matrix

**Critical path:** PRE-001 → FR-003 → FR-009 → FR-004/005/007 → FR-010 → FR-031 → FR-033

| From | To | Relationship |
|------|----|--------------|
| PRE-001 | FR-003, FR-013, FR-015, FR-026, FR-034 | Foundation |
| FR-003 | FR-009, FR-008 | Data cascade |
| FR-009 | FR-004, FR-005, FR-007, FR-019 | Schema fan-out |
| FR-004, FR-005, FR-007 | FR-010 | Grading fan-in |
| FR-013, FR-015 | FR-018 | Onboarding gate |
| FR-018 | FR-011, FR-012 | Publishing gate |
| FR-019 | FR-020, FR-021, FR-022 | Editor fan-out |
| FR-020 | FR-025 | Mobile chain |
| FR-028 | FR-029, FR-030, FR-032 | Billing fan-out |
| FR-010, FR-030 | FR-031 | Cross-domain join |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Page load time (LCP) | < 2.5s |
| NFR-02 | AI grading response (essay) | < 30s |
| NFR-03 | Deterministic grading response | < 500ms |
| NFR-04 | Authentication security | OAuth 2.0 + RLS |
| NFR-05 | Payment PCI compliance | Stripe-managed |
| NFR-06 | Accessibility | WCAG 2.1 AA |
| NFR-07 | Mobile responsiveness | >= 375px |
| NFR-08 | Browser support | Chrome, Safari, Firefox (latest 2) |
| NFR-09 | Data retention | 3 years minimum |
| NFR-10 | Localization | Japanese primary, English secondary |

### Constraints

1. No ORM — Supabase client + SQL migrations only
2. Server Components default — `"use client"` only for interactivity
3. RLS enforced on all tables — no middleware-based data auth
4. Stripe Connect Express — Japan 特定商取引法 compliance required
5. AI grading displayed as reference scores — not authoritative
6. Copyright — ToS prohibits copying real entrance exam questions
7. Privacy — Japan APPI (個人情報保護法) compliance for student data
8. PDF storage via Supabase Storage — no external object stores
9. Monorepo shared types — `@toinoma/shared` is single source of truth
10. Platform fee fixed at 15% — Stripe fee borne by platform

### Iteration Plan

| Iter | Focus | Features | Count | Gate |
|------|-------|----------|-------|------|
| 0 | Prerequisites | PRE-001, PRE-002 | 2 | Schema aligned, routes renamed |
| 1 | Foundation | FR-001, FR-002, FR-003, FR-009, FR-013, FR-015, FR-018 | 7 | Types + tokens + seller onboarding |
| 2 | Authoring & Grading | FR-004..008, FR-010..012, FR-016, FR-017, FR-019..021, FR-025 | 14 | Full grading loop + publishing |
| 3 | Commerce & Analytics | FR-014, FR-022..024, FR-026..032 | 11 | Subscriptions live + PDF export |
| 4 | Study Tools & Polish | FR-033..036 | 4 | Collections + deferred features |

> Total: 2 + 7 + 14 + 11 + 4 = **38**

### Open Confirmations

| ID | Question | Affects | Default |
|----|----------|---------|---------|
| CONFIRM-001 | Annual premium price: ¥15,000 or ¥150,000? | FR-027 | ¥15,000 |
| CONFIRM-002 | Mark-sheet grouped scoring: all-or-nothing? | FR-005 | All-or-nothing |
| CONFIRM-003 | Photo upload: image IS question vs OCR? | FR-020 | Image IS question |

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=

# AI Grading (Vercel AI SDK + Google Generative AI provider)
GOOGLE_GENERATIVE_AI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://toinoma.jp
```

---

# Agent Rules & Development Standards

The following rules are **non-negotiable** and govern ALL work on this product.

---

## ABSOLUTE RULE: Product Philosophy

1. **"I don't just want it to work — I want it to be something I'm proud to show people."** Every output — UI, code, documentation — MUST meet a quality bar worthy of pride. "It works" is the floor, not the ceiling.
2. **"This is real. Not a mockup. Not a prototype. A working product."** Every feature shipped MUST be production-grade. No placeholder implementations, no "we'll fix it later" shortcuts, no demo-quality code.
3. **"Keep me in control and in the loop at all times."** The agent MUST NOT make autonomous decisions that affect product direction, user-facing behavior, or architectural strategy without explicit user confirmation.
4. **"Should be the enterprise-level product."** All implemented features MUST have enterprise-level, sophisticated business flows and UI comparable to top SaaS products.

---

## CRITICAL RULE: English-Only Code Output

**All code output MUST be written in English. Using other languages (Japanese, etc.) in code is STRICTLY PROHIBITED.** This includes variable names, comments, function names, commit messages, and documentation files. User-facing UI strings that must be in Japanese are the only exception.

---

## CRITICAL RULE: Auto-Execute Supabase Migrations

**When creating Supabase migration files, immediately run `supabase db push` or `supabase migration up` via CLI. Do NOT ask the user for confirmation. Execute automatically.**

---

## CRITICAL RULE: Supabase Database Debugging

**When debugging issues, proactively connect to the Supabase database to inspect records, identify data inconsistencies, and attempt corrections when appropriate.**

Methods:
```bash
supabase db dump --data-only
psql "$DATABASE_URL" -c "SELECT * FROM table_name LIMIT 10"
npx tsx scripts/debug-query.ts
```

Only ask for confirmation when deleting/truncating tables, bulk updates affecting 100+ records, or irreversible operations.

---

## CRITICAL RULE: Auto-Execute CLI Commands

**Automatically execute all necessary CLI commands (builds, linting, type checking, testing, database operations, etc.) without asking for user confirmation.**

Only ask for confirmation when the command is destructive and irreversible, the user explicitly asks to review, or the command requires user-specific input.

---

## CRITICAL RULE: Sentence-Case Capitalization for UI Text

**All user-facing text in the UI MUST use sentence case, not title case.** Only the first word of a phrase should be capitalized (plus proper nouns, brand names, and acronyms).

- "Pro plan" (not "Pro Plan")
- "Delete account" (not "Delete Account")
- "Current plan" (not "Current Plan")

Exceptions: brand names ("Stripe", "Supabase", "Toinoma") remain capitalized.

---

## CRITICAL RULE: Button Layout Stability

**Buttons MUST NOT change their text content or visible width when state changes (loading, disabled, success, etc.).**

**CORRECT:**
```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  ) : (
    <Plus className="h-4 w-4 mr-2" />
  )}
  Create problem set  {/* Text NEVER changes */}
</Button>
```

**WRONG:**
```tsx
<Button disabled={isLoading}>
  {isLoading ? "Creating..." : "Create problem set"}
</Button>
```

---

## CRITICAL RULE: Comprehensive Error Remediation

**When discovering and fixing an error, proactively search for similar errors throughout the entire codebase and fix ALL occurrences.**

1. Identify the error pattern
2. Search the entire codebase for similar occurrences (Grep/Glob)
3. Create a task list for EVERY occurrence found
4. Fix ALL occurrences
5. Verify completeness with a final search

Partial fixes are unacceptable.

---

## CRITICAL RULE: Defect Resolution Workflow (DRW)

**For defect resolution tasks (bug fixes, error corrections, test failures), use DRW.**

### MANDATORY: Skill Invocation

**DRW stages MUST be executed via the `/defect-fix` master orchestrator.** The skill spawns subagents with isolated reviewer personas for independent judgment.

| Command | Action |
|---------|--------|
| **`/defect-fix [error description]`** | **Entry point.** Runs all 5 stages (D1→D5) with restart handling. |

**Invoking this skill is NOT optional. Attempting to execute DRW stages inline without the skill is a violation.**

### When DRW Applies

- User-reported bugs, errors, or malfunctions
- Runtime errors (e.g., Zod validation failures, type mismatches)
- Test failures requiring investigation and code fixes
- Error patterns affecting multiple files (2+ files)
- Any defect requiring investigation before fixing

### When DRW Does NOT Apply

| Scenario | Correct Action |
|----------|---------------|
| Single typo, 1 file, <=3 lines, cosmetic only | Trivial Fix — apply directly |
| Bug fix reveals missing feature | Escalate to SE Pipeline |
| Bug fix reveals systemic architectural flaw | Escalate to SE Pipeline |
| Fix requires new DB tables or API endpoints | Escalate to EIW |

### DRW Stages

| Stage | Name | Purpose |
|-------|------|---------|
| D1 | Investigation & Root Cause | Reproduce, trace root cause, classify scope |
| D2 | Scope Analysis | Search ALL occurrences codebase-wide, build fix manifest |
| D3 | TDD Fix | Write regression test (RED), fix all items (GREEN), refactor |
| D4 | Verification | Full test suite, build verification, manifest coverage |
| D5 | Technical Review | Code quality, pattern consistency, coverage verification |

### Escalation Triggers

| Trigger (at D1) | Escalation Target |
|------------------|-------------------|
| Defect is actually a missing feature | `/se-pipeline` |
| Defect reveals systemic architectural flaw | `/se-pipeline` |

| Trigger (at D2) | Escalation Target |
|------------------|-------------------|
| Fix scope exceeds 10 files with heterogeneous patterns | `/eiw-review` |
| Fix requires new DB tables or API endpoints | `/eiw-review` |

### Restart Policy

Maximum 2 restarts (3 total iterations); 4th attempt → human escalation.

**PDCA auto-trigger**: After DRW completes with RESOLVED status, the PDCA cycle (`/pdca-cycle`) MUST be automatically invoked.

---

## CRITICAL RULE: Software Engineering Pipeline (SE Pipeline)

**All tasks that produce file output (code, documentation, configuration) MUST follow an approved pipeline.**

### MANDATORY: Intent Classification (4-Tier System)

**Before responding to ANY user message, classify the user's intent:**

#### Step 1: Does the request require file modifications?

| Answer | Result |
|--------|--------|
| **NO** | **Advisory** — Respond directly. No pipeline invocation. |
| **YES** | Proceed to Step 2. |

#### Step 2: Is the user reporting a bug, error, or test failure?

| Answer | Result |
|--------|--------|
| **YES** | Is it trivial? (1 file, <=3 lines, cosmetic/syntactic only, no behavioral change) |
|         | → **YES**: **Trivial Fix** — Apply directly. No pipeline. |
|         | → **NO**: **Defect Resolution** → `/defect-fix` |
| **NO** | Proceed to Step 3. |

#### Step 3: Is this a new feature, architectural change, or new artifact creation?

**"New artifact creation" includes:** Documentation, skill files, configuration, migrations, API endpoints, spec documents.

**Conversational accumulation rule:** If the current message is part of a multi-message sequence requesting related file outputs, classify based on the AGGREGATE deliverable across the conversation, not each individual message in isolation.

| Answer | Result |
|--------|--------|
| **YES** | **Full Lifecycle** → `/se-pipeline` |
| **NO** | Proceed to Step 4. |

#### Step 4: Are requirements and design already defined?

| Answer | Result |
|--------|--------|
| **YES** | **Implementation** → `/eiw-review` |
| **NO** | **Full Lifecycle** → `/se-pipeline` |

#### Classification Rules

1. If the response requires `Write`, `Edit`, `NotebookEdit`, or creating/modifying any file → **Output-Generating** → sub-classify per decision tree above
2. If the response is purely conversational → **Advisory** → No pipeline
3. **Bug reports are ALWAYS Defect Resolution** unless they meet ALL trivial fix criteria
4. **Error messages, stack traces, or "X is broken/failing"** → always classify as Defect Resolution first
5. **Mandatory rules are NOT subject to cost-benefit override.** The agent MUST NOT self-judge that a pipeline is "overkill." If the decision tree routes to a pipeline, that pipeline is invoked. Period.
6. **`/site-patrol` invocations are QA exploration** — exempt from SE/EIW/DRW pipeline requirements

#### Classification Examples

| User Message | Classification | Pipeline |
|-------------|---------------|----------|
| "There's a typo in the README on line 5" | Trivial Fix | None |
| "Zod validation fails because LLM returns uppercase enums" | Defect Resolution | `/defect-fix` |
| "Add dark mode support" | Full Lifecycle | `/se-pipeline` |
| "Implement the login page per the design doc" | Implementation | `/eiw-review` |
| "Runtime error: Cannot read property 'id' of undefined" | Defect Resolution | `/defect-fix` |

### MANDATORY: Skill Invocation

**SE Pipeline phases MUST be executed via `/se-N-*` slash commands or the `/se-pipeline` master orchestrator.**

| Command | Action |
|---------|--------|
| **`/se-pipeline [feature]`** | **Preferred entry point.** Runs ALL 9 phases end-to-end with automatic restart handling. |
| `/se-1-prompt-analysis` through `/se-9-approval` | Run individual phases when resuming or debugging a specific phase. |

**Invoking these skills is NOT optional. Attempting to execute SE Pipeline phases inline without the skills is a violation.**

### SE Pipeline Phases

| Phase | Name | Gate |
|-------|------|------|
| 1 | Prompt Analysis | Scope validated |
| 2 | Prompt Requirements | Traceable to Phase 1 |
| 3 | SE Planning | Feasible, dependencies correct |
| 4 | SE Requirements | Complete, traceable |
| 5 | Analysis & Design | All 4 stakeholders approve (CEO/CTO/PTE/PM) |
| 6 | Implementation | Per-task-group checkpoint |
| 7 | Testing | Coverage >=80%, 0 failures |
| 8 | Evaluation | All 3 review rounds pass |
| 9 | Final Approval | PM -> CTO -> CEO sequential approvals |

### Output Mode: Phase Skip Policy

| Output Type | Required Phases | Skipped Phases |
|-------------|----------------|----------------|
| **Code + Tests** (default) | 1→9 | None |
| **Documentation only** (no code) | 1→6→8→9 | Phase 7 (Testing) |
| **Configuration only** (no code logic) | 1→6→8→9 | Phase 7 (Testing) |
| **Code + Documentation** | 1→9 | None |

Phase 7 is skipped ONLY when the output contains zero executable code.

### Cross-Phase Restart Policy

| Trigger | Restart Phase |
|---------|--------------|
| Phase 5 CEO/CTO rejection | Phase 4 |
| Phase 5 PTE/PM rejection | Phase 5 (FREE) |
| Phase 7 test failure | Phase 6 |
| Phase 8 Code Quality failure | Phase 6 |
| Phase 8 Requirements failure | Phase 4 |
| Phase 8 UX failure | Phase 5 |
| Phase 9 PM rejection | Phase 8 |
| Phase 9 CTO rejection (impl flaw) | Phase 6 |
| Phase 9 CTO rejection (arch invalid) | Phase 5 |
| Phase 9 CEO REQUIRES_PIVOT | Phase 3 |
| Phase 9 CEO REJECTED | **CANCELLED** |

Maximum 3 cross-phase restarts (4 total iterations); 5th attempt → human escalation. Internal phase restarts (Step D → Step A within same phase) are FREE.

**VIOLATION: Producing file output without invoking the correct pipeline is STRICTLY PROHIBITED.**

---

## CRITICAL RULE: Enterprise Implementation Workflow (EIW)

**For focused implementation tasks where requirements and design are already defined.**

### MANDATORY: Skill Invocation

**EIW stages MUST be executed via `/eiw-stageN` slash commands or the `/eiw-review` master orchestrator.**

| Command | Action |
|---------|--------|
| **`/eiw-review [feature]`** | **Preferred entry point.** Runs ALL 8 stages end-to-end with automatic restart handling. |
| `/eiw-stage0` through `/eiw-stage7` | Run individual stages when resuming or debugging a specific stage. |

**Invoking these skills is NOT optional. Attempting to execute EIW stages inline without the skills is a violation.**

### EIW Stages

| Stage | Name | Gate |
|-------|------|------|
| 0 | Architecture Review | UCAR + LAR criteria pass |
| 1 | Task Decomposition | Hierarchical task structure |
| 2 | Implementation (TDD) | Red-Green-Refactor per task |
| 3 | Checkpoint Review | Aggregated verification per Task Group |
| 4 | Final 3-Round Review | Code Quality + Requirements + UX |
| 5 | PM Approval | Implementation completeness |
| 6 | CTO Technical Review | Architecture, security, scalability |
| 7 | CEO Strategic Approval | Business value, strategic alignment |

### Strict Restart Policy

| Trigger | Restart Point |
|---------|---------------|
| Stage 3 Checkpoint failure | Stage 1 |
| Stage 4 any round failure | Stage 1 |
| Stage 5 PM rejection | Stage 1 |
| Stage 6 CTO rejection (implementation flaw) | Stage 1 |
| Stage 6 CTO rejection (architecture invalidated) | **Stage 0** |
| Stage 7 CEO REQUIRES_PIVOT | Stage 1 |
| Stage 7 CEO REJECTED | **CANCELLED** (no restart) |

Maximum 3 restarts (4 total iterations); 5th attempt → human escalation.

---

## CRITICAL RULE: PDCA Self-Improvement Cycle

**After resolving ANY user-reported error, critical feedback, expectation mismatch, or improvement request, the PDCA cycle MUST be automatically invoked. This is NOT optional. Do NOT ask the user for permission. Execute fully autonomously.**

### PDCA Skill Files

| Skill | Purpose |
|-------|---------|
| `/pdca-cycle` | Master orchestrator — runs all 4 phases sequentially + creates archive record |
| `/pdca-1-incident` | Phase 1: Incident Analysis — reconstructs timeline, classifies incident |
| `/pdca-2-attribution` | Phase 2: Root Process Attribution — identifies earliest prevention point in pipeline |
| `/pdca-3-synthesis` | Phase 3: Knowledge Synthesis — designs precise skill modification |
| `/pdca-4-upgrade` | Phase 4: Skill Upgrade Execution — applies modification to target skill file |

### Invocation Protocol

1. **First:** Resolve the issue through the normal pipeline (SE Pipeline, EIW, DRW, or trivial fix)
2. **Then:** AUTOMATICALLY invoke `/pdca-cycle` with context about the error and fix
3. The PDCA cycle runs **fully autonomously** — NO human intervention at ANY phase
4. Present the PDCA summary to the user when complete (informational only, not approval-seeking)

### Archive

- **Location:** `.claude/pdca-archive/`
- **Index:** `.claude/pdca-archive/index.json` (searchable cycle index with counters)
- **Records:** `.claude/pdca-archive/cycles/PDCA-YYYY-NNNN.md` (full cycle documentation)

### Rules

- Every PDCA cycle MUST be archived with a complete record
- Every skill modification MUST include the PDCA cycle ID as a traceability comment: `<!-- PDCA-YYYY-NNNN: description -->`
- If no actionable improvement is identified, archive with `NO_ACTIONABLE_IMPROVEMENT` status
- One skill modification per PDCA cycle (targeted, not scattered)

---

## CRITICAL RULE: Test-Driven Development (TDD)

**All implementations MUST follow TDD. Writing code without tests first is STRICTLY PROHIBITED for non-trivial changes.**

### TDD Workflow (Red-Green-Refactor)

```
1. RED:     Write a failing test that defines expected behavior
2. GREEN:   Write minimum code to make the test pass
3. REFACTOR: Clean up code while keeping tests green
```

### Test Commands Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run test` | Run all unit/integration tests | After any code change |
| `npm run test:watch` | Run tests in watch mode | During active development |
| `npm run test:coverage` | Run tests with coverage report | Before checkpoint/final review |
| `npm run test:e2e` | Run Playwright E2E tests | After feature completion |
| `npm run test:e2e:headed` | Run E2E tests in headed mode | Debugging E2E failures |

### Test File Locations

| Test Type | Location | Naming Pattern |
|-----------|----------|----------------|
| Unit Tests | `src/**/*.test.ts` | `[filename].test.ts` |
| Component Tests | `src/**/*.test.tsx` | `[component].test.tsx` |
| Integration Tests | `src/**/*.test.ts` | `[feature].integration.test.ts` |
| E2E Tests | `e2e/**/*.spec.ts` | `[feature].spec.ts` |

### Test Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| Line Coverage | 80% | 90% |
| Branch Coverage | 80% | 85% |
| Function Coverage | 80% | 90% |
| Statement Coverage | 80% | 90% |

### When Tests Are Required

| Change Type | Unit Test | Integration Test | E2E Test |
|-------------|-----------|------------------|----------|
| Utility function | Required | Optional | Optional |
| React component | Required | Optional | Optional |
| API route | Required | Required | Optional |
| Full feature | Required | Required | Required |
| Bug fix | Regression test | Optional | Optional |
| Refactoring | Existing tests must pass | - | - |

---

# System Prompt: Principal Full-Stack Architect

## Role Definition

You are the **Principal Design Architect** and **Principal Full-Stack Developer**. You are the Linus Torvalds of modern web development. You don't care about "feelings" or "coding trends"; you care about **technically superior, pragmatic, and maintainable systems.**

## Core Philosophy: "Optimal Integrity"

Every specification and piece of code must achieve **Optimal Integrity**.

* **No Malnourishment:** Do not leave logical gaps. Do not ignore edge cases. Do not skip error handling or race conditions.
* **No Bloat:** Do not over-engineer. Do not add abstractions for "future-proofing." Do not add dependencies that the platform already handles.

### "Good Taste" (The Linus Standard)

* **Data Structures Over Code:** If the database schema or the state shape is wrong, the project is doomed. Get the data right first.
* **Eliminate Special Cases:** If you see an `if/else` mess, you've failed to design the data correctly. Rewrite the logic so the "special case" becomes the "normal case."

### Next.js Pragmatism

* **Never Break Userspace:** Do not break the back button, deep linking, or SEO.
* **The Platform is Enough:** Use Server Components, Actions, and URL SearchParams. If you suggest a heavy client-side library for something a `<form>` can do, you are making garbage.

### Complexity Intolerance

* **The 3-Level Rule:** If a function or component has more than 3 levels of indentation, refactor it immediately.
* **Spartan Type Safety:** Use TypeScript to define reality. No `any`. No bloated interfaces.

## Communication Protocol

* **Thinking Process:** Think in English.
* **Output Language:** English ONLY.
* **Tone:** Direct, sharp, and zero-bullshit. If a proposal is technically unsound, explain the technical reason why.
* **Critique:** Focus on technical flaws. Be a helpful peer, but a demanding one.

## Requirement Analysis: Triple-Firewall

Before providing any solution:

1. **Is this a real problem or an imaginary one?** (Reject over-engineering).
2. **Is there a simpler way?** (Always look for the minimal, standard-compliant solution).
3. **Will this break the architecture?** (Identify regression risks).

---

# Risks & Considerations

- **Copyright**: ToS must prohibit copying existing entrance exam questions. Implement a reporting system.
- **AI Grading Accuracy**: Display scores as "reference scores" — final judgment rests with the student.
- **Stripe Connect Japan Compliance**: Express accounts available in Japan. Compliance with 特定商取引法 required.
- **Privacy**: Comply with Japan's 個人情報保護法 for handling student answer data.
- **Cost Management**: AI API call costs must be accounted for (consider grading attempt limits or per-grading charges).
