# Feature Matrix — Complete Implementation Checklist

> **Total Features:** 198 | **P0:** 78 | **P1:** 62 | **P2:** 40 | **P3:** 18
> **Status Key:** [ ] Not started | [~] In progress | [x] Complete

---

## USR — User Management (17 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| USR-001 | Google OAuth registration | P0 | [x] | Sign up / sign in via Google OAuth 2.0. Auto-create `profiles` record via trigger. |
| USR-002 | X (Twitter) OAuth registration | P0 | [x] | Sign up / sign in via X/Twitter OAuth 2.0. Same flow as Google. |
| USR-003 | Auth callback handling | P0 | [x] | `/auth/callback` route exchanges OAuth code for session. |
| USR-004 | User profile display | P0 | [x] | `profiles` table: display_name, avatar_url. Public read, self-update. |
| USR-005 | Profile editing page | P0 | [x] | `/settings/profile` — edit display_name, avatar_url. |
| USR-006 | Account settings page | P0 | [x] | `/settings` — hub for profile, notifications, subscription, seller, account deletion. |
| USR-007 | Account deletion | P0 | [x] | `/settings` — soft delete with APPI-compliant data handling. Confirmation modal. |
| USR-008 | Email notification preferences | P1 | [ ] | Toggle email notifications per category (purchases, grading, announcements, marketing). |
| USR-009 | In-app notification preferences | P1 | [ ] | Toggle in-app notifications per category. |
| USR-010 | Purchase history page | P0 | [ ] | `/dashboard/history` — list of all purchased problem sets with dates and amounts. |
| USR-011 | User dashboard overview | P0 | [ ] | `/dashboard` — recent activity, active problem sets, performance summary. |
| USR-012 | Activity feed | P2 | [ ] | Recent actions: purchases, submissions, gradings, favorites. |
| USR-013 | Session management | P3 | [ ] | View active sessions, revoke sessions from other devices. |
| USR-014 | Login page | P0 | [x] | `/login` — Google and X/Twitter OAuth buttons. |
| USR-015 | Signup page | P0 | [x] | `/login` — same page, "Get started free" CTA. |
| USR-016 | Forgot password flow | P0 | [x] | N/A for OAuth-only auth. Page exists but redirects. |
| USR-017 | Onboarding welcome flow | P1 | [ ] | First-login wizard: choose subjects of interest, set study goals. |

---

## SLR — Seller System (24 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| SLR-001 | Seller mode toggle button | P0 | [ ] | Prominent button in navbar (like Udemy's "Instructor" toggle). Visible to ALL authenticated users. Navigates to `/sell`. |
| SLR-002 | Seller ToS acceptance modal | P0 | [ ] | Non-dismissable modal at `/sell` for users who haven't accepted seller ToS. Checkbox + accept button. Stores `tos_accepted_at`. |
| SLR-003 | Seller ToS redirect gate | P0 | [ ] | All `/sell/*` sub-routes redirect to `/sell` if seller ToS not accepted. Layout-level check. |
| SLR-004 | Seller profile creation | P0 | [~] | Display name, bio, university, circle name. Part of onboarding flow. |
| SLR-005 | Stripe Connect onboarding | P0 | [~] | Express account creation + identity verification. Required before publishing paid content. |
| SLR-006 | Seller dashboard overview | P0 | [~] | `/sell` — stats cards (total sets, published, drafts, revenue, submissions), recent activity. |
| SLR-007 | Problem set management list | P0 | [~] | `/sell` — table/card list of all seller's problem sets with status, actions (edit, publish, delete). |
| SLR-008 | Revenue dashboard | P1 | [ ] | `/sell/analytics` — revenue charts (daily/weekly/monthly), top-selling sets, conversion rates. |
| SLR-009 | Sales analytics | P1 | [ ] | `/sell/analytics` — detailed analytics: sales by subject, by time period, buyer demographics. |
| SLR-010 | Submission viewer | P1 | [ ] | `/sell/[id]/submissions` — view student submissions for own problem sets. Individual answers + scores. |
| SLR-011 | Student performance analytics | P2 | [ ] | Per-problem-set analytics: average score, score distribution, common mistakes, question-level breakdown. |
| SLR-012 | Seller public profile page | P1 | [ ] | `/seller/[id]` — public profile: name, bio, university, circle, published sets, ratings, total students. |
| SLR-013 | Seller settings page | P0 | [~] | `/settings/seller` — edit seller profile, view ToS acceptance, Stripe status. |
| SLR-014 | Payout history | P1 | [ ] | `/sell/payouts` — list of Stripe payouts with amounts, dates, status. |
| SLR-015 | Announcement system | P2 | [ ] | Seller can post announcements to all purchasers of a specific problem set. In-app + email notification. |
| SLR-016 | Review response | P1 | [ ] | Seller can write a public response to student reviews on their problem sets. |
| SLR-017 | Seller verification badge | P2 | [ ] | Visual badge for sellers who completed identity verification via Stripe Connect. |
| SLR-018 | Seller tier system | P3 | [ ] | Bronze/Silver/Gold/Platinum based on sales volume. Displayed on profile. |
| SLR-019 | Seller onboarding completion banner | P0 | [ ] | Dashboard banner for sellers who haven't completed full onboarding (profile + Stripe). CTA to complete. |
| SLR-020 | Quick stats API | P1 | [ ] | Server-side data fetching for dashboard stats (total revenue, total students, total submissions). |
| SLR-021 | Problem set duplication | P1 | [ ] | Duplicate an existing problem set to create a variant. Copies questions from pool. |
| SLR-022 | Bulk problem set actions | P2 | [ ] | Select multiple sets → bulk publish, unpublish, delete. |
| SLR-023 | Seller ToS document page | P0 | [ ] | `/legal/seller-tos` — full seller Terms of Service document in Japanese. |
| SLR-024 | Seller help guide | P1 | [ ] | `/help/seller-guide` — guide for new sellers: how to create problems, set rubrics, price sets. |

---

## ATH — Content Authoring (38 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| ATH-001 | Problem pool page | P0 | [ ] | `/sell/pool` — grid/list of all individual questions owned by seller. Search, filter by subject/type/tag. |
| ATH-002 | Essay question creation | P0 | [ ] | Create essay-type question: question text (rich text + images), model answer, rubric elements with point values. |
| ATH-003 | Mark-sheet question creation | P0 | [ ] | Create mark-sheet (bubble) question: question text, choice set (A-E or 1-5), correct answer(s), grouped scoring option. |
| ATH-004 | Fill-in-the-blank question creation | P0 | [ ] | Create fill-in-blank question: question text with blank placeholders, acceptable answers (exact match + variants). |
| ATH-005 | Multiple choice question creation | P0 | [ ] | Create multiple-choice question: question text, options (2-8), single or multi-select, correct answer(s). |
| ATH-006 | Question metadata/tagging | P0 | [ ] | Per question: subject, topic tags (free text), difficulty (easy/medium/hard), estimated time (minutes). |
| ATH-007 | Question preview | P0 | [ ] | Live preview of question as students will see it. Toggle between problem-sheet view and answer-sheet view. |
| ATH-008 | Rubric editor (essay) | P0 | [ ] | Define rubric elements: scoring criteria text, point value per element. Support partial credit. |
| ATH-009 | Rubric editor (objective) | P0 | [ ] | Mark-sheet/fill-in/MC: correct answers, scoring mode (all-or-nothing or partial). |
| ATH-010 | Model answer editor | P0 | [ ] | Rich text editor for model answers. Supports LaTeX, images. Displayed in review mode. |
| ATH-011 | Video attachment per question | P1 | [ ] | Upload up to 3 explanation videos per question. Displayed in review mode after submission. |
| ATH-012 | Video upload management | P1 | [ ] | Upload videos to Supabase Storage. Progress indicator. Max file size: 500MB. Supported: mp4, webm. |
| ATH-013 | Image upload for questions | P0 | [ ] | Upload images within question text. Inline display. Drag-and-drop + click-to-upload. |
| ATH-014 | LaTeX/math formula support | P0 | [ ] | KaTeX rendering in question text, model answers, and rubric descriptions. Inline (`$...$`) and block (`$$...$$`). |
| ATH-015 | Vertical text mode | P1 | [ ] | Toggle vertical writing (tategaki) for Japanese/kokugo questions. Affects question text, answer area, and PDF export. |
| ATH-016 | Problem set composition | P0 | [ ] | `/sell/sets/new` — select questions from problem pool to compose a problem set. Drag-and-drop ordering. |
| ATH-017 | Problem set sectioning | P0 | [ ] | Organize questions into numbered sections (大問1, 大問2, ...) with section titles and point allocations. |
| ATH-018 | Problem set metadata | P0 | [ ] | Title, description (marketing text), subject, university target, difficulty, cover image. |
| ATH-019 | Problem set pricing | P0 | [ ] | Set price in JPY (0 = free). Price validation: min 0, max 50,000. |
| ATH-020 | Problem set cover image | P1 | [ ] | Upload a cover image for marketplace display. Auto-generate from first question if not provided. |
| ATH-021 | Problem set preview config | P1 | [ ] | Seller selects which questions (up to 2) are shown as free preview on the detail page. |
| ATH-022 | Problem set publish/unpublish | P0 | [ ] | Publish: validates completeness (at least 1 question, rubric defined, price set). Unpublish: removes from marketplace but retains purchaser access. |
| ATH-023 | Problem set draft management | P0 | [ ] | Auto-save drafts. Draft status visible in management list. |
| ATH-024 | AI-powered PDF import | P1 | [ ] | Upload PDF → AI extracts questions, answer types, and model answers. Seller reviews + edits before saving to pool. |
| ATH-025 | Bulk question import | P2 | [ ] | Import multiple questions from structured CSV/JSON format. |
| ATH-026 | Question duplication | P1 | [ ] | Duplicate a question in the pool to create a variant. |
| ATH-027 | Question edit history | P2 | [ ] | Version history for questions. View previous versions. Revert to a previous version. |
| ATH-028 | Time limit settings | P1 | [ ] | Optional time limit per problem set (minutes). Displayed to student. Timer enforced in solving interface. |
| ATH-029 | Scoring configuration | P0 | [ ] | Total points (auto-calculated from question points). Section point subtotals. Configurable per section. |
| ATH-030 | A4 page layout | P1 | [ ] | Problem set layout targets A4 paper. Page break controls between questions/sections. |
| ATH-031 | Margin options | P2 | [ ] | Narrow (15mm), normal (25mm), wide (30mm) margins for PDF export. |
| ATH-032 | Rich text editor | P0 | [ ] | WYSIWYG editor for question text: bold, italic, underline, lists, tables, images, LaTeX, furigana. |
| ATH-033 | Furigana support | P1 | [ ] | Ruby text (furigana) in question text for reading assistance. |
| ATH-034 | Table support in questions | P1 | [ ] | Insert and edit tables within question text (for data-based problems). |
| ATH-035 | Question difficulty auto-suggest | P3 | [ ] | AI suggests difficulty based on question content and rubric complexity. |
| ATH-036 | Problem set template | P2 | [ ] | Pre-built templates by subject/university for quick set creation. |
| ATH-037 | Collaborative editing | P3 | [ ] | Multiple sellers (same circle) can edit the same problem pool. |
| ATH-038 | Content validation on publish | P0 | [ ] | Validate: all questions have rubrics, all mark-sheet questions have correct answers, total points > 0, at least 1 question. |

---

## MKT — Marketplace (30 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| MKT-001 | Landing page | P0 | [~] | `/` — hero section, featured problem sets, new arrivals, subject categories, trending, CTA. |
| MKT-002 | Browse page | P0 | [ ] | `/explore` — grid of problem set cards with filters panel (sidebar on desktop, sheet on mobile). |
| MKT-003 | Search with autocomplete | P0 | [ ] | Navbar search input with debounced autocomplete. Searches title, description, subject, university. |
| MKT-004 | Filter: subject | P0 | [ ] | Multi-select: math, english, japanese, physics, chemistry, biology, japanese_history, world_history, geography. |
| MKT-005 | Filter: university | P1 | [ ] | Free-text with autocomplete from existing university values in problem_sets. |
| MKT-006 | Filter: difficulty | P0 | [ ] | Select: easy, medium, hard. |
| MKT-007 | Filter: price range | P1 | [ ] | Slider or min/max inputs. Includes "free only" toggle. |
| MKT-008 | Filter: rating | P1 | [ ] | Minimum star rating (1-5). |
| MKT-009 | Sort options | P0 | [ ] | Newest, most popular (purchases), highest rated, price (low→high), price (high→low). |
| MKT-010 | Problem set detail page | P0 | [ ] | `/problem/[id]` — title, description, subject, difficulty, price, seller info, sample questions, reviews, purchase button. |
| MKT-011 | Sample question preview | P1 | [ ] | Show 1-2 questions as preview on detail page (configured by seller in ATH-021). |
| MKT-012 | Seller info on detail page | P0 | [ ] | Seller card: avatar, name, university, circle, total sets, average rating. Link to seller profile. |
| MKT-013 | Related problem sets | P1 | [ ] | "Similar problem sets" section on detail page. Same subject + similar difficulty/university. |
| MKT-014 | Purchase flow | P0 | [ ] | Purchase button → Stripe Checkout → confirmation page. Free sets skip checkout. |
| MKT-015 | Free problem set access | P0 | [ ] | Price = 0: instant access, no checkout. Creates purchase record. |
| MKT-016 | Shopping cart | P2 | [ ] | Add to cart → cart page → checkout multiple sets at once. |
| MKT-017 | Wishlist/favorites | P0 | [~] | Heart icon toggle on problem set cards. `/dashboard/favorites` page. |
| MKT-018 | Recently viewed | P2 | [ ] | Track last 20 viewed problem sets. Display in dashboard or browse page sidebar. |
| MKT-019 | Trending problem sets | P1 | [ ] | Algorithm: weighted by recent purchases + views + ratings. Displayed on landing page. |
| MKT-020 | New arrivals | P0 | [ ] | Problem sets published in last 7 days. Displayed on landing page. |
| MKT-021 | Rankings | P1 | [ ] | `/rankings` — top problem sets by subject, overall. Weekly and all-time. |
| MKT-022 | Subject category pages | P1 | [ ] | `/explore/[subject]` — dedicated page per subject with curated content. |
| MKT-023 | University-specific pages | P2 | [ ] | `/explore/university/[name]` — all problem sets targeting a specific university. |
| MKT-024 | Price display | P0 | [ ] | Format: "¥1,500" or "無料". Show original + discounted price when coupon applied. |
| MKT-025 | Coupon/discount codes | P2 | [ ] | Seller creates coupon codes (% off or fixed amount). Applied at checkout. Expiry date. Usage limit. |
| MKT-026 | Bundle pricing | P3 | [ ] | Seller bundles multiple problem sets at a discount. Bundle detail page. |
| MKT-027 | Social sharing | P2 | [ ] | Share buttons on detail page: X/Twitter, LINE, copy link. OGP meta tags for rich previews. |
| MKT-028 | Report content | P1 | [ ] | "Report" button on problem set/review. Reason categories: copyright, inappropriate, spam. Admin queue. |
| MKT-029 | Problem set card component | P0 | [ ] | Reusable card: cover image, title, subject badge, difficulty badge, price, rating stars, seller name. |
| MKT-030 | Empty states | P0 | [ ] | "No results found" with suggestions. "No problem sets yet" for new subjects. |

---

## SLV — Solving & Grading (28 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| SLV-001 | Solving interface layout | P0 | [ ] | `/problem/[id]/solve` — split view: problem sheet (left/top) + answer sheet (right/bottom). Mirrors real exam format. |
| SLV-002 | Problem sheet display | P0 | [ ] | Read-only display of problem content. Sections, questions, images, tables. Scrollable. |
| SLV-003 | Answer sheet — essay | P0 | [ ] | Multi-line text area with character count. Optional: grid paper overlay (genko yoshi style). |
| SLV-004 | Answer sheet — mark-sheet | P0 | [ ] | Interactive bubble grid. Click to fill/unfill. Visual feedback. Grouped by question number. |
| SLV-005 | Answer sheet — fill-in-blank | P0 | [ ] | Text input fields aligned with blank positions in the problem. |
| SLV-006 | Answer sheet — multiple choice | P0 | [ ] | Radio buttons (single select) or checkboxes (multi select). Clear visual selection state. |
| SLV-007 | Timer | P1 | [ ] | Countdown timer when problem set has time limit. Warning at 5 min, 1 min. Auto-submit on expiry. |
| SLV-008 | Progress indicator | P0 | [ ] | "Question 3 of 15" + visual progress bar. Shows answered/unanswered status per question. |
| SLV-009 | Save draft answers | P0 | [ ] | Auto-save every 30 seconds. Manual save button. Drafts persist across sessions. |
| SLV-010 | Submit answers | P0 | [ ] | Confirmation dialog before submission. Warns about unanswered questions. Creates `submissions` record. |
| SLV-011 | AI grading — essay | P0 | [ ] | Send essay answer + rubric to AI. Partial credit per rubric element. Detailed feedback per element. |
| SLV-012 | AI grading — mark-sheet | P0 | [ ] | Exact match comparison. All-or-nothing per group (configurable). Instant, no AI needed. |
| SLV-013 | AI grading — fill-in-blank | P0 | [ ] | Exact match with tolerance (whitespace, full-width/half-width normalization). AI fallback for near-matches. |
| SLV-014 | AI grading — multiple choice | P0 | [ ] | Exact match comparison. Instant, no AI needed. |
| SLV-015 | Grading result page | P0 | [ ] | `/problem/[id]/result/[sid]` — total score, section scores, per-question breakdown. |
| SLV-016 | Score summary visualization | P1 | [ ] | Radar chart by section. Bar chart comparing with average. Score percentage with color coding. |
| SLV-017 | AI feedback per question | P0 | [ ] | Per-question: what was correct, what was partially correct, what was wrong. Specific improvement advice. |
| SLV-018 | Partial credit explanation | P0 | [ ] | For essays: which rubric elements were satisfied (green), partially (yellow), missing (red). Point breakdown. |
| SLV-019 | Improvement advice | P1 | [ ] | AI-generated study advice based on weak areas. References to relevant concepts. |
| SLV-020 | Camera answer capture | P1 | [ ] | Mobile: camera button on answer sheet. Capture handwritten answer. Crop/rotate. Upload to Supabase Storage. |
| SLV-021 | Handwritten answer processing | P1 | [ ] | AI Vision processes captured image. Extracts text for essay grading. Displays original image + extracted text. |
| SLV-022 | Re-attempt (re-solve) | P0 | [ ] | "Solve again" button on result page. Creates new submission. Previous attempts viewable in history. |
| SLV-023 | Submission history per set | P0 | [ ] | `/problem/[id]/history` — list of all attempts with scores, dates. Score trend chart. |
| SLV-024 | Grading disclaimer | P0 | [ ] | "AI grading is a reference score. It is not an authoritative assessment." Displayed on every result page. |
| SLV-025 | Grading queue/status | P1 | [ ] | While AI grades (async for essays): loading state with estimated time. Push notification when complete. |
| SLV-026 | Vertical text answer input | P1 | [ ] | For Japanese/kokugo: vertical text input area. Right-to-left column flow. |
| SLV-027 | LaTeX rendering in answers | P1 | [ ] | Students can type LaTeX in essay answers for math. Live preview. |
| SLV-028 | Answer validation | P0 | [ ] | Mark-sheet: validate selection count. Fill-in: validate required fields. Prevent empty submissions. |

---

## STD — Study Tools (22 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| STD-001 | Review mode | P0 | [ ] | `/problem/[id]/result/[sid]` — view correct answers alongside student answers. Color-coded: correct (green), partial (yellow), wrong (red). |
| STD-002 | Video playback in review | P1 | [ ] | Explanation videos attached by seller displayed per question in review mode. Inline video player. |
| STD-003 | Model answer display | P0 | [ ] | Show seller's model answer in review mode. Toggleable visibility. |
| STD-004 | Custom collections | P0 | [ ] | `/dashboard/collections` — CRUD collections. Name, description. |
| STD-005 | Add questions to collections | P0 | [ ] | From review mode or purchase detail: "Add to collection" button per question. Select target collection. |
| STD-006 | Collection solving | P0 | [ ] | `/dashboard/collections/[id]/solve` — solve questions in collection using the standard solving interface. |
| STD-007 | Problem shuffle | P1 | [ ] | Toggle to randomize question order within a collection when solving. |
| STD-008 | Progress tracking per set | P0 | [ ] | Dashboard widget: completion percentage, best score, last attempt date per purchased problem set. |
| STD-009 | Performance analytics | P1 | [ ] | `/dashboard/analytics` — charts: score trends over time, performance by subject, by difficulty. |
| STD-010 | Weakness identification | P2 | [ ] | AI analyzes submission history to identify weak topics/question types. Suggests problem sets to improve. |
| STD-011 | Study plan suggestions | P3 | [ ] | AI generates weekly study plan based on target university, subjects, and current performance. |
| STD-012 | PDF export — problems only | P0 | [ ] | Download purchased problem set as printable PDF. A4 format. Problems only (no answers). |
| STD-013 | PDF export — answers only | P0 | [ ] | Download answer sheet as PDF. Blank answer areas for mark-sheet/fill-in. Essay answer space. |
| STD-014 | PDF export — problems + answers | P1 | [ ] | Combined PDF: problems followed by model answers. For self-study after completing. |
| STD-015 | Print-friendly formatting | P1 | [ ] | PDF uses print-optimized fonts, margins, page breaks. Vertical text for kokugo problems. |
| STD-016 | Notes per question | P2 | [ ] | Personal notes attached to individual questions. Visible in review mode. |
| STD-017 | Bookmarks | P2 | [ ] | Bookmark specific questions within a problem set for quick access. |
| STD-018 | Spaced repetition reminders | P3 | [ ] | Notify student to re-attempt problem sets based on spaced repetition algorithm. |
| STD-019 | Score comparison | P1 | [ ] | Compare your score with: previous attempts, average of all students, top 10% of students. |
| STD-020 | Submission detail view | P0 | [ ] | `/dashboard/history` detail: full submission with answers, scores, AI feedback, model answers. |
| STD-021 | Dashboard submission history | P0 | [~] | `/dashboard/history` — all submissions across all problem sets. Filter by subject, date, score range. |
| STD-022 | Recently solved | P1 | [ ] | Dashboard widget: last 5 solved problem sets with scores. Quick link to re-solve or review. |

---

## PAY — Payments (16 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| PAY-001 | Stripe Checkout integration | P0 | [ ] | Create Stripe Checkout session for problem set purchase. Redirect to Stripe → success/cancel URLs. |
| PAY-002 | Free problem set access | P0 | [ ] | Price = 0: skip Stripe. Create `purchases` record directly. Redirect to problem set page. |
| PAY-003 | Purchase confirmation page | P0 | [ ] | `/purchase/success?session_id=xxx` — confirm purchase. Link to start solving. |
| PAY-004 | Purchase receipt | P1 | [ ] | Stripe receipt email. In-app receipt viewable from purchase history. |
| PAY-005 | Refund policy page | P0 | [ ] | `/legal/refund-policy` — clear refund policy. Japanese law compliant (特定商取引法). |
| PAY-006 | Refund processing | P1 | [ ] | Admin-initiated refund via Stripe. Revoke problem set access. Update purchase record. |
| PAY-007 | Stripe Connect payouts | P0 | [~] | Platform receives payment → deducts 15% fee → transfers remainder to seller's Connect account. |
| PAY-008 | Platform fee (15%) | P0 | [ ] | Automatic 15% deduction on all paid transactions. Platform bears Stripe processing fee (3.6% + ¥40). |
| PAY-009 | Payout schedule display | P1 | [ ] | Show sellers their payout schedule (Stripe's automatic payouts). |
| PAY-010 | Revenue tracking | P1 | [ ] | Seller dashboard: total revenue, revenue this month, per-set revenue. |
| PAY-011 | Tax handling | P1 | [ ] | Japanese consumption tax (10%) included in displayed price. Invoice with tax breakdown. |
| PAY-012 | Coupon system | P2 | [ ] | Seller creates coupons: percentage or fixed discount, expiry date, usage limit, specific sets or all sets. |
| PAY-013 | Gift purchase | P3 | [ ] | Buy a problem set as a gift. Recipient receives access via email/link. |
| PAY-014 | Payment method management | P2 | [ ] | Stripe Customer Portal: manage saved cards for subscriptions. |
| PAY-015 | Transaction history (seller) | P1 | [ ] | `/sell/transactions` — all transactions: sales, refunds, payouts. CSV export. |
| PAY-016 | Stripe webhook handling | P0 | [ ] | `/api/webhooks/stripe` — handle: checkout.session.completed, payment_intent.succeeded, refund events. |

---

## SUB — Subscriptions (16 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| SUB-001 | Free tier | P0 | [~] | Default tier. 3 AI gradings/month. Basic features. |
| SUB-002 | Basic tier (¥500/month) | P0 | [ ] | 30 AI gradings/month. Priority grading queue. |
| SUB-003 | Pro tier (¥2,000/month) | P0 | [ ] | Unlimited AI gradings. AI study assistant. Advanced analytics. |
| SUB-004 | Annual pricing | P0 | [ ] | Basic: ¥5,000/year (2 months free). Pro: ¥20,000/year (2 months free). |
| SUB-005 | Subscription page | P0 | [ ] | `/settings/subscription` — current plan, usage, upgrade/downgrade CTAs. |
| SUB-006 | Plan upgrade flow | P0 | [ ] | Select new plan → Stripe Checkout → immediate upgrade. Prorated billing. |
| SUB-007 | Plan downgrade flow | P1 | [ ] | Downgrade takes effect at end of current billing period. Confirm dialog with consequences. |
| SUB-008 | Cancellation flow | P0 | [ ] | Cancel subscription. Access continues until period end. Re-subscribe option. Retention offer. |
| SUB-009 | Usage tracking display | P0 | [ ] | Dashboard widget: "5/30 AI gradings used this month" with progress bar. |
| SUB-010 | AI study assistant | P1 | [ ] | Chat interface: ask questions about problems, request hints, get explanations. Uses Google Generative AI. Context-aware per problem set. |
| SUB-011 | Stripe Billing integration | P0 | [ ] | Create Stripe subscriptions. Handle plan changes. Metered billing for overages. |
| SUB-012 | Subscription webhooks | P0 | [~] | Handle: customer.subscription.created/updated/deleted, invoice.payment_succeeded/failed. |
| SUB-013 | Grace period | P1 | [ ] | 3-day grace period after payment failure before downgrade to free. Retry notification. |
| SUB-014 | Feature gating | P0 | [ ] | Middleware/utility checks subscription tier before allowing: AI grading, study assistant, advanced analytics. |
| SUB-015 | Usage limit enforcement | P0 | [ ] | Track AI grading count per billing period. Reject grading requests when limit exceeded. Show upgrade prompt. |
| SUB-016 | Billing history | P1 | [ ] | `/settings/billing` — list of invoices, payment status, receipt links (via Stripe). |

---

## MOB — Mobile & Capture (11 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| MOB-001 | Responsive design (375px+) | P0 | [~] | All pages responsive. Mobile-first breakpoints. Touch targets ≥ 44px. |
| MOB-002 | Mobile navigation | P0 | [~] | Bottom tab bar on mobile. Hamburger menu for secondary nav. |
| MOB-003 | Touch-optimized interactions | P0 | [ ] | Swipe gestures for navigation. Long-press for context menus. Haptic feedback (native). |
| MOB-004 | Camera answer capture | P1 | [ ] | Camera button on answer sheet. Opens device camera (via `<input type="file" capture>`). |
| MOB-005 | Image crop/rotate | P1 | [ ] | After capture: crop to answer area, rotate, adjust brightness/contrast. Preview before upload. |
| MOB-006 | Mobile solving interface | P0 | [ ] | Stacked layout: problem sheet (top, scrollable) → answer sheet (bottom, scrollable). Tab toggle between sheets. |
| MOB-007 | PWA support | P2 | [ ] | Web app manifest. Service worker for offline caching. "Add to Home Screen" prompt. |
| MOB-008 | Offline problem access | P3 | [ ] | Cache purchased problem sets for offline solving. Sync answers when back online. |
| MOB-009 | Push notifications | P2 | [ ] | Web push via service worker. Grading complete, announcements, subscription reminders. |
| MOB-010 | Mobile PDF viewer | P1 | [ ] | In-app PDF viewer for problem set PDFs. Pinch-to-zoom. Page navigation. |
| MOB-011 | Mobile mark-sheet input | P0 | [ ] | Large touch targets for bubble selection. Visual and haptic feedback on selection. |

---

## NTF — Notifications (12 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| NTF-001 | Notification center | P1 | [ ] | Bell icon in navbar with unread count badge. Dropdown panel with notification list. |
| NTF-002 | Purchase confirmation | P0 | [ ] | In-app + email: "Your purchase of [set name] is confirmed. Start solving now!" |
| NTF-003 | Grading complete | P0 | [ ] | In-app + email: "Your answers for [set name] have been graded. Score: X/Y." |
| NTF-004 | New review (for seller) | P1 | [ ] | In-app: "New review on [set name]: ★★★★☆" |
| NTF-005 | Seller announcement | P1 | [ ] | In-app + email: announcement from seller of purchased problem set. |
| NTF-006 | Subscription events | P1 | [ ] | Email: payment confirmation, renewal reminder (3 days before), cancellation confirmation. |
| NTF-007 | Usage warning | P1 | [ ] | In-app: "You've used 25/30 AI gradings this month." at 80% and 100% thresholds. |
| NTF-008 | Email notification system | P1 | [ ] | Transactional emails via Resend or Supabase Edge Functions + SMTP. |
| NTF-009 | Notification read/unread | P1 | [ ] | Click notification to mark as read. "Mark all as read" button. |
| NTF-010 | Notification preferences | P1 | [ ] | Per-category toggles: purchases, grading, reviews, announcements, marketing. |
| NTF-011 | Welcome email | P1 | [ ] | Email on first sign-up: welcome + onboarding guide link. |
| NTF-012 | Inactivity re-engagement | P3 | [ ] | Email after 14 days of inactivity: "We miss you! Check out new problem sets." |

---

## REV — Reviews & Ratings (11 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| REV-001 | Star rating (1-5) | P0 | [ ] | Rate a purchased problem set after solving. 5-star scale. Required to leave a written review. |
| REV-002 | Written review | P0 | [ ] | Text review (10-500 chars). Submitted with star rating. One review per user per set. |
| REV-003 | Review listing | P0 | [ ] | Problem set detail page: list of reviews sorted by newest/most helpful. Pagination. |
| REV-004 | Rating summary | P0 | [ ] | Average rating (1 decimal), total review count, star distribution bar chart (5★: 40%, 4★: 30%, ...). |
| REV-005 | Review filtering/sorting | P1 | [ ] | Sort: newest, oldest, highest, lowest, most helpful. Filter: by star rating. |
| REV-006 | Helpful vote | P1 | [ ] | "Was this review helpful?" Yes/No buttons. Helpful count displayed. |
| REV-007 | Seller response | P1 | [ ] | Seller can post one public response per review. Displayed below the review. |
| REV-008 | Review moderation | P1 | [ ] | Report inappropriate reviews. Admin review queue. |
| REV-009 | Review prompt | P1 | [ ] | Prompt to review after completing a problem set (3 days after first submission). Non-intrusive. |
| REV-010 | Review on seller profile | P1 | [ ] | Aggregate rating on seller public profile. "4.5 average across 12 problem sets." |
| REV-011 | Review policy | P0 | [ ] | Only purchasers who have submitted at least once can review. Prevent fake reviews. |

---

## QNA — Q&A System (8 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| QNA-001 | Q&A section per problem set | P1 | [ ] | Tab on problem set detail page: "Q&A". List of questions from purchasers. |
| QNA-002 | Post question | P1 | [ ] | Purchasers can post questions. Text + optional image. |
| QNA-003 | Answer question | P1 | [ ] | Seller (and other purchasers) can answer. Threaded replies. |
| QNA-004 | Upvote answers | P2 | [ ] | Upvote helpful answers. Sort by votes. |
| QNA-005 | Mark answer as accepted | P2 | [ ] | Seller can mark an answer as the accepted/best answer. |
| QNA-006 | Q&A notification | P1 | [ ] | Notify seller when new question posted. Notify asker when answered. |
| QNA-007 | Q&A search | P2 | [ ] | Search within Q&A of a problem set. |
| QNA-008 | Pin important Q&A | P2 | [ ] | Seller can pin important Q&A to the top of the list. |

---

## ADM — Administration (12 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| ADM-001 | Admin dashboard | P1 | [ ] | `/admin` — platform overview: total users, sellers, problem sets, revenue, active subscriptions. |
| ADM-002 | User management | P1 | [ ] | `/admin/users` — list, search, view, suspend/unsuspend users. |
| ADM-003 | Content moderation queue | P1 | [ ] | `/admin/reports` — reported problem sets and reviews. Approve/remove/warn actions. |
| ADM-004 | Platform analytics | P2 | [ ] | Charts: user growth, revenue growth, popular subjects, geographic distribution. |
| ADM-005 | Revenue reports | P1 | [ ] | Monthly revenue breakdown: gross, platform fees, Stripe fees, net. CSV export. |
| ADM-006 | Seller verification | P2 | [ ] | Review Stripe Connect verification status. Manual verification badge assignment. |
| ADM-007 | Content policy page | P0 | [ ] | `/legal/content-policy` — rules for problem set content (no real exam copying, originality). |
| ADM-008 | Support system | P2 | [ ] | Contact form → admin email queue. Ticket tracking. |
| ADM-009 | Announcement broadcast | P2 | [ ] | Platform-wide announcements: maintenance, new features, policy changes. |
| ADM-010 | Feature flags | P2 | [ ] | Toggle features on/off without deployment. Used for gradual rollout. |
| ADM-011 | Audit log | P2 | [ ] | Track admin actions: user suspensions, content removals, payout holds. |
| ADM-012 | Admin role guard | P1 | [ ] | Admin routes protected by admin flag on profiles. Not exposed in UI. |

---

## INF — Infrastructure (21 features)

| ID | Feature | Priority | Status | Description |
|----|---------|----------|--------|-------------|
| INF-001 | Japanese primary language | P0 | [~] | All UI in Japanese. `lang="ja"` on HTML. Japanese date/number formatting. |
| INF-002 | English secondary language | P3 | [ ] | i18n support for English. Toggle in settings. |
| INF-003 | Vertical text rendering | P1 | [ ] | CSS `writing-mode: vertical-rl` for kokugo problem display. Applies to question text, answer area, PDF export. |
| INF-004 | SEO — meta tags | P0 | [ ] | Dynamic `<title>`, `<meta description>` per page. Japanese keywords. |
| INF-005 | SEO — OGP tags | P1 | [ ] | Open Graph tags for social sharing. Problem set cover image in OGP. |
| INF-006 | SEO — structured data | P2 | [ ] | JSON-LD: Product (problem set), Organization (Toinoma), BreadcrumbList. |
| INF-007 | Error pages | P0 | [ ] | Custom 404 and 500 pages. Japanese text. Link back to home. |
| INF-008 | Loading states | P0 | [ ] | Skeleton loaders for all data-fetching pages. Suspense boundaries. |
| INF-009 | Accessibility — WCAG 2.1 AA | P0 | [ ] | Semantic HTML, ARIA labels, keyboard navigation, focus management, color contrast. |
| INF-010 | Performance — LCP < 2.5s | P0 | [ ] | Image optimization (next/image), code splitting, lazy loading, edge caching. |
| INF-011 | Security — OWASP top 10 | P0 | [ ] | XSS prevention, CSRF tokens, input sanitization, secure headers, rate limiting. |
| INF-012 | APPI compliance | P0 | [ ] | Privacy policy, data handling disclosure, deletion rights, consent management. |
| INF-013 | 特定商取引法 compliance | P0 | [ ] | `/legal/tokushoho` — required seller disclosure page. Business name, address, return policy. |
| INF-014 | Cookie consent | P1 | [ ] | Cookie consent banner for analytics cookies. Essential cookies exempt. |
| INF-015 | Terms of Service | P0 | [ ] | `/legal/terms` — platform Terms of Service. Japanese. |
| INF-016 | Privacy Policy | P0 | [ ] | `/legal/privacy` — APPI-compliant privacy policy. Japanese. |
| INF-017 | Help/FAQ pages | P1 | [~] | `/help/faq` — categorized FAQ. `/help/guide` — user guide. |
| INF-018 | Rate limiting | P1 | [ ] | API rate limiting: 100 req/min per user. AI grading: tier-based limits. |
| INF-019 | Error tracking | P1 | [ ] | Sentry or similar for error monitoring. Source maps. Alert on error spikes. |
| INF-020 | Analytics | P2 | [ ] | Google Analytics 4 or Plausible. Page views, events, conversions. |
| INF-021 | Health check endpoint | P1 | [ ] | `/api/health` — returns 200 with DB connectivity check. Used by monitoring. |

---

## Summary by Priority

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 78 | Must-have for launch — blocks release |
| P1 | 62 | Important — required within 2 weeks of launch |
| P2 | 40 | Nice-to-have — can ship post-launch |
| P3 | 18 | Future — planned but not committed |
| **Total** | **198** | |

## Implementation Order (Recommended)

### Wave 1 — Foundation (P0 Core)
SLR-001→003 (Seller mode toggle + ToS gate), ATH-001→009 (Problem pool + question types), ATH-016→019 (Problem set composition), SLV-001→006 (Solving interface), SLV-010→015 (AI grading), MKT-010 (Detail page), MKT-014→015 (Purchase flow), PAY-001→002 (Stripe Checkout)

### Wave 2 — Marketplace (P0 Discovery)
MKT-001→009 (Browse + search + filters), MKT-029→030 (Cards + empty states), STD-001→006 (Review mode + collections), STD-012→013 (PDF export), REV-001→004 (Ratings), SUB-001→006 (Subscriptions)

### Wave 3 — Polish (P1)
ATH-011→015 (Videos, LaTeX, vertical text), ATH-024 (PDF import), SLR-008→010 (Analytics), SLV-020→021 (Camera capture), NTF-001→008 (Notifications), MOB-004→005 (Camera), REV-005→009 (Reviews polish)

### Wave 4 — Advanced (P2/P3)
QNA-001→008 (Q&A system), ADM-001→012 (Admin), MKT-016→018 (Cart, recently viewed), STD-010→011 (AI study tools), remaining P2/P3 features
