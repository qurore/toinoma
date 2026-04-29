# Infrastructure — Detailed Specification

> **Features:** INF-001 through INF-021, MOB-001 through MOB-011, NTF-001 through NTF-012, REV-001 through REV-011, QNA-001 through QNA-008, ADM-001 through ADM-012

## 1. Vertical Text Support (INF-003)

### Implementation
For Japanese language (kokugo) problems, question text and answer areas render in vertical writing mode.

### CSS Classes
```css
.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  line-height: 2;
  letter-spacing: 0.05em;
  font-family: 'Noto Serif JP', serif;
}

/* Horizontal-in-vertical for numbers */
.vertical-text .tcy {
  text-combine-upright: all;
}

/* Prevent vertical rendering for specific elements */
.vertical-text .horizontal-override {
  writing-mode: horizontal-tb;
}
```

### Where Applied
- Question text display (when `questions.vertical_text = true`)
- Essay answer input area (textarea with vertical writing mode)
- PDF export for kokugo problems
- Review mode display

### Challenges
- Textarea with vertical writing: needs CSS `writing-mode: vertical-rl` on the textarea element
- Character count display: positioned appropriately for vertical flow
- Line breaks: follow Japanese typographic rules (禁則処理)
- Mixed content: numbers and Latin characters handled by `text-combine-upright`

## 2. SEO (INF-004 to INF-006)

### Meta Tags (Per Page)
| Page | Title | Description |
|------|-------|-------------|
| `/` | 問の間 - AIが採点する大学受験問題マーケットプレイス | AI部分点採点で大学受験対策。問題セットを購入して、実践的な受験勉強を。 |
| `/explore` | 問題を探す - 問の間 | 科目・大学・難易度で大学受験問題を検索。AI採点付き。 |
| `/problem/[id]` | [Set Title] - [Subject] - 問の間 | [Set Description (truncated to 160 chars)] |
| `/seller/[id]` | [Seller Name] - 問の間 | [Seller bio (truncated)] |
| `/login` | ログイン - 問の間 | 問の間にログインして、大学受験対策を始めましょう。 |

### OGP Tags
```html
<meta property="og:title" content="[Title]" />
<meta property="og:description" content="[Description]" />
<meta property="og:image" content="[Cover image or default OGP image]" />
<meta property="og:url" content="https://toinoma.jp/problem/[id]" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="ja_JP" />
<meta property="og:site_name" content="問の間" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[Title]" />
<meta name="twitter:description" content="[Description]" />
<meta name="twitter:image" content="[Cover image]" />
```

### Structured Data (JSON-LD)
```jsonc
// Problem Set Detail Page
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "[Set Title]",
  "description": "[Set Description]",
  "image": "[Cover Image URL]",
  "offers": {
    "@type": "Offer",
    "price": "[Price]",
    "priceCurrency": "JPY",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[Average Rating]",
    "reviewCount": "[Review Count]"
  }
}
```

## 3. Notifications (NTF-001 to NTF-012)

### Database Schema
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'purchase', 'grading', 'review', 'announcement', 'subscription', 'system'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,           -- Internal link (e.g., '/problem/xxx/result/yyy')
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
```

### Notification Center UI
- Bell icon in navbar with red dot + unread count badge
- Click opens dropdown panel (max-height: 400px, scrollable)
- Each notification: icon (by type), title, relative time, read/unread indicator
- Click notification: navigate to `link` URL + mark as read
- "Mark all as read" button at top
- "View all" link at bottom → `/notifications` full page

### Email Notifications
- Transactional emails for critical events (purchase, grading, subscription)
- Use Supabase Edge Functions or Resend API
- Respect user's notification preferences
- Unsubscribe link in every email

## 4. Reviews & Ratings (REV-001 to REV-011)

### Database Schema
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  problem_set_id UUID NOT NULL REFERENCES problem_sets(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT CHECK (char_length(body) >= 10 AND char_length(body) <= 500),
  seller_response TEXT,
  seller_responded_at TIMESTAMPTZ,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, problem_set_id)
);

CREATE TABLE review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

CREATE INDEX idx_reviews_problem_set ON reviews(problem_set_id, created_at DESC);
CREATE INDEX idx_reviews_user ON reviews(user_id);
```

### RLS Policies
- Anyone can read reviews (public)
- Only purchasers with at least 1 submission can create reviews
- Self-update/delete only
- Seller can update `seller_response` on reviews for their own sets

### Review Eligibility
A user can review a problem set if:
1. They have purchased it (`purchases` record exists)
2. They have submitted at least 1 attempt (`submissions` record exists)
3. They haven't already reviewed it (UNIQUE constraint)

### Rating Summary Component
```
★★★★☆ 4.2 (28件のレビュー)

5★ ████████████████████ 40%
4★ ███████████████      30%
3★ ████████             16%
2★ ███                   6%
1★ ████                  8%
```

## 5. Q&A System (QNA-001 to QNA-008)

### Database Schema
```sql
CREATE TABLE qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id UUID NOT NULL REFERENCES problem_sets(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  question_id UUID REFERENCES questions(id),  -- Optional: link to specific question
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qa_question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_questions_set ON qa_questions(problem_set_id, created_at DESC);
CREATE INDEX idx_qa_answers_question ON qa_answers(qa_question_id, created_at);
```

### RLS
- Purchasers can read and post Q&A for purchased problem sets
- Sellers can read and answer Q&A for their own problem sets
- Seller can pin/unpin and mark answers as accepted

## 6. Administration (ADM-001 to ADM-012)

### Admin Access Control

Admin authorization is governed by the `ADMIN_EMAILS` environment variable — a server-only, comma-separated email allowlist with case-insensitive + whitespace-trimmed exact-string match (no plus-addressing normalization). Admin status is **not** persisted in the database.

- **Grant admin:** append the email to `ADMIN_EMAILS` and redeploy
- **Revoke admin:** remove the email from `ADMIN_EMAILS` and redeploy
- **Helper module:** `apps/web/src/lib/auth/admin.ts` exports `isAdmin(email)` (pure boolean), `requireAdmin()` (page-guard, redirects on failure), and `requireAdminAction()` (server-action-guard, returns `{adminId} | {error}`)
- **Fail-closed:** unset/empty `ADMIN_EMAILS` denies all admin access

Email-rotation policy: admin grants are tied to the email-controlling identity. Operators MUST rotate `ADMIN_EMAILS` whenever a listed email changes ownership.

### Admin Routes
```
/admin                  Dashboard overview
/admin/users            User management
/admin/reports          Content moderation queue
/admin/revenue          Revenue reports
/admin/announcements    Platform announcements
```

### Admin Dashboard
- Total users (with growth chart)
- Total sellers
- Total problem sets (published/draft)
- Total revenue (with growth chart)
- Active subscriptions by tier
- Recent reports (pending moderation)

### Content Moderation Queue
- Reported items: problem sets, reviews, Q&A
- Per report: reporter, reason, reported content, date
- Actions: dismiss report, remove content, warn user, suspend user
- Status: pending, reviewed, action_taken

## 7. Legal Pages

### Required Pages
| Page | URL | Content |
|------|-----|---------|
| Terms of Service | `/legal/terms` | Platform ToS |
| Privacy Policy | `/legal/privacy` | APPI-compliant privacy policy |
| Seller ToS | `/legal/seller-tos` | Seller-specific terms |
| Refund Policy | `/legal/refund` | Refund conditions |
| 特定商取引法 | `/legal/tokushoho` | Required commercial transaction disclosure |
| Content Policy | `/legal/content-policy` | What can/cannot be published |
| Cookie Policy | `/legal/cookies` | Cookie usage disclosure |

### Content Requirements
All pages in Japanese. Must include:
- Effective date
- Last updated date
- Table of contents for long documents
- Contact information for questions

## 8. Error Pages (INF-007)

### 404 Page
```
┌──────────────────────────────┐
│                              │
│    404 — ページが            │
│    見つかりませんでした       │
│                              │
│    お探しのページは存在しない │
│    か、移動した可能性が       │
│    あります。                 │
│                              │
│    [ホームに戻る]            │
│    [問題を探す]              │
│                              │
└──────────────────────────────┘
```

### 500 Page
```
┌──────────────────────────────┐
│                              │
│    500 — エラーが            │
│    発生しました               │
│                              │
│    しばらく経ってから再度     │
│    お試しください。           │
│                              │
│    [ホームに戻る]            │
│    [お問い合わせ]            │
│                              │
└──────────────────────────────┘
```

## 9. Mobile Experience (MOB-001 to MOB-011)

### Responsive Breakpoints
| Breakpoint | Target | Layout |
|------------|--------|--------|
| < 640px (sm) | Mobile | Single column, bottom nav, stacked |
| 640-768px (md) | Tablet | Two-column where appropriate |
| 768-1024px (lg) | Small desktop | Full layout |
| > 1024px (xl) | Desktop | Full layout with sidebars |

### Touch Optimization
- All interactive elements: min 44px touch target
- Tap feedback (subtle background change)
- Swipe gestures: swipe between problem sheet / answer sheet tabs
- No hover-dependent UI (all interactions work with tap)

### Mobile Navigation
- Bottom tab bar: ホーム, 探す, マイページ, 出品者 (if auth'd)
- Navbar: logo + search icon + user avatar
- Sheet-based filters on browse page (slide up from bottom)

### Camera Capture (MOB-004, MOB-005)
```html
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  capture="environment"
  onChange={handleImageCapture}
/>
```

After capture:
1. Display image preview
2. Crop tool (rectangular selection)
3. Rotate buttons (90° CW/CCW)
4. Brightness/contrast sliders
5. Confirm → compress → upload to Supabase Storage

## 10. Performance (INF-010)

### Targets
| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP | < 2.5s | Largest Contentful Paint |
| FID | < 100ms | First Input Delay |
| CLS | < 0.1 | Cumulative Layout Shift |
| TTFB | < 200ms | Time to First Byte |

### Optimization Strategies
- Server Components by default (zero client JS)
- `next/image` with responsive sizes and lazy loading
- Code splitting per route
- Dynamic imports for heavy components (editor, charts)
- Edge caching via Vercel
- Supabase connection pooling
- Database indexes on all query patterns

## 11. Security (INF-011)

### OWASP Top 10 Mitigations
| Risk | Mitigation |
|------|------------|
| Injection | Supabase parameterized queries, no raw SQL in client code |
| Broken Auth | Supabase Auth + RLS, no custom auth implementation |
| XSS | React auto-escaping, CSP headers, no `dangerouslySetInnerHTML` without sanitization |
| CSRF | Server Actions (POST-only), SameSite cookies |
| Security Misconfig | Environment variables, no secrets in client code |
| Insecure Dependencies | `pnpm audit`, Dependabot |
| Broken Access Control | RLS policies on all tables, server-side auth checks |

### Headers
```typescript
// next.config.ts
headers: [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' ..."
  }
]
```

## 12. Accessibility (INF-009)

### WCAG 2.1 AA Requirements
- Color contrast ratio: 4.5:1 for normal text, 3:1 for large text
- All images have `alt` text
- All form inputs have associated `<label>` elements
- Keyboard navigation for all interactive elements
- Focus indicators visible (not removed by CSS)
- ARIA labels on icon-only buttons
- Skip-to-content link
- Screen reader announcements for dynamic content
- Reduced motion support: `@media (prefers-reduced-motion: reduce)`
