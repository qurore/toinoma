# Marketplace — Detailed Specification

> **Features:** MKT-001 through MKT-030 | **Priority:** Mostly P0-P1

## 1. Overview

The marketplace is the discovery and purchase layer. Students browse, search, and filter problem sets by subject, university, difficulty, price, and rating. The marketplace experience is optimized for Japanese university entrance exam preparation.

## 2. Landing Page (MKT-001)

### URL: `/`

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ AppNavbar                                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│         問の間 — 大学受験の問題と出会う場所              │
│         AIが採点する、新しい受験対策のかたち              │
│                                                          │
│         [問題を探す]  [出品者になる]                      │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ 📚 科目から探す                                         │
│ [数学] [英語] [国語] [物理] [化学] [生物] [日本史] ...  │
├─────────────────────────────────────────────────────────┤
│ 🔥 人気の問題セット                                     │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │Card 1  │ │Card 2  │ │Card 3  │ │Card 4  │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
├─────────────────────────────────────────────────────────┤
│ 🆕 新着問題セット                                       │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │Card 5  │ │Card 6  │ │Card 7  │ │Card 8  │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
├─────────────────────────────────────────────────────────┤
│ ⭐ 高評価の問題セット                                    │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │Card 9  │ │Card 10 │ │Card 11 │ │Card 12 │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
├─────────────────────────────────────────────────────────┤
│ 💡 Toinomaの特徴                                       │
│ [AI部分点採点] [出題者の解説動画] [カスタム復習]         │
├─────────────────────────────────────────────────────────┤
│ Footer: Links, Legal, Social                             │
└─────────────────────────────────────────────────────────┘
```

### Sections
1. **Hero:** Tagline + CTAs ("問題を探す" → `/explore`, "出品者になる" → `/sell`)
2. **Subject Navigation:** Horizontally scrollable subject pills/chips
3. **Trending:** Top 8 by recent purchase volume (last 7 days)
4. **New Arrivals:** Latest 8 published (last 7 days)
5. **Top Rated:** Highest average rating (min 5 reviews)
6. **Features:** 3-column grid explaining Toinoma's differentiators
7. **Footer:** Legal links, social links, company info

## 3. Browse Page (MKT-002 to MKT-009)

### URL: `/explore`

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ AppNavbar                                                │
├──────────┬──────────────────────────────────────────────┤
│ Filters  │ Results                                      │
│ (sidebar)│                                              │
│          │ "数学" の問題セット (142件)                    │
│ 科目     │ Sort: [人気順 ▼]  View: [≡] [⊞]             │
│ ☑ 数学   │                                              │
│ ☐ 英語   │ ┌────────┐ ┌────────┐ ┌────────┐            │
│ ☐ 国語   │ │Card    │ │Card    │ │Card    │            │
│ ...      │ │        │ │        │ │        │            │
│          │ └────────┘ └────────┘ └────────┘            │
│ 難易度   │ ┌────────┐ ┌────────┐ ┌────────┐            │
│ ☐ 易しい │ │Card    │ │Card    │ │Card    │            │
│ ☑ 普通   │ │        │ │        │ │        │            │
│ ☐ 難しい │ └────────┘ └────────┘ └────────┘            │
│          │                                              │
│ 価格     │ [Load More]                                  │
│ [0]─[max]│                                              │
│ ☐ 無料   │                                              │
│          │                                              │
│ 評価     │                                              │
│ ★★★★☆+  │                                              │
│          │                                              │
│ 大学     │                                              │
│ [______] │                                              │
├──────────┴──────────────────────────────────────────────┤
│ Footer                                                   │
└─────────────────────────────────────────────────────────┘
```

### Filters (Sidebar on Desktop, Sheet on Mobile)
| Filter | Type | Options |
|--------|------|---------|
| Subject | Multi-checkbox | 9 subjects |
| Difficulty | Multi-checkbox | Easy, Medium, Hard |
| Price | Range slider + "Free only" toggle | ¥0 — ¥50,000 |
| Rating | Minimum stars | ★1+ through ★4+ |
| University | Autocomplete text input | From existing data |

### Sort Options
| Option | SQL | Default |
|--------|-----|---------|
| 人気順 (Popular) | ORDER BY purchase_count DESC | ✅ |
| 新着順 (Newest) | ORDER BY created_at DESC | |
| 評価順 (Highest rated) | ORDER BY avg_rating DESC | |
| 価格: 安い順 (Price low) | ORDER BY price ASC | |
| 価格: 高い順 (Price high) | ORDER BY price DESC | |

### URL Search Params
Filters are URL-based for shareability and SEO:
```
/explore?subject=math&difficulty=medium&sort=popular&q=微分
```

### Pagination
- Infinite scroll with "Load more" button (not traditional pagination)
- 20 items per page
- Show total count: "142件の問題セット"

## 4. Problem Set Card (MKT-029)

### Card Component
```
┌──────────────────────┐
│ [Cover Image]        │
│                      │
│ ┌──────────────────┐ │
│ │ 数学    普通     │ │  ← Subject + Difficulty badges
│ └──────────────────┘ │
│ Title of Problem Set │
│                      │
│ ★★★★☆ 4.2 (28)      │  ← Rating + review count
│                      │
│ Seller Name          │
│                      │
│ ¥1,500         ♡    │  ← Price + Favorite toggle
└──────────────────────┘
```

### Card Data
| Element | Source | Format |
|---------|--------|--------|
| Cover image | problem_sets.cover_image_url or placeholder | 16:9 aspect |
| Subject badge | problem_sets.subject → SUBJECT_LABELS | Colored badge |
| Difficulty badge | problem_sets.difficulty → DIFFICULTY_LABELS | Colored badge |
| Title | problem_sets.title | Truncate at 2 lines |
| Rating | AVG(reviews.rating) | ★ + decimal + count |
| Seller name | seller_profiles.seller_display_name | Text |
| Price | problem_sets.price | ¥X,XXX or "無料" |
| Favorite | favorites table | Heart icon toggle |

## 5. Problem Set Detail Page (MKT-010 to MKT-013)

### URL: `/problem/[id]`

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ AppNavbar                                                │
├─────────────────────────────────────────────────────────┤
│ Breadcrumb: ホーム > 数学 > [Title]                     │
│                                                          │
│ ┌────────────────────────┬──────────────────────────┐   │
│ │ [Cover Image]          │ Title of Problem Set      │   │
│ │                        │ ★★★★☆ 4.2 (28件のレビュー)│   │
│ │                        │                          │   │
│ │                        │ 科目: 数学               │   │
│ │                        │ 難易度: 普通             │   │
│ │                        │ 問題数: 15問             │   │
│ │                        │ 配点: 100点満点          │   │
│ │                        │ 制限時間: 60分           │   │
│ │                        │                          │   │
│ │                        │ ¥1,500                   │   │
│ │                        │ [購入する]  [♡]          │   │
│ │                        │                          │   │
│ │                        │ 出品者: [Avatar] Name    │   │
│ │                        │ XX大学 / Circle Name     │   │
│ └────────────────────────┴──────────────────────────┘   │
│                                                          │
│ [概要] [サンプル問題] [レビュー] [Q&A]  ← Tabs          │
│                                                          │
│ === 概要 Tab ===                                         │
│ Description text from seller...                          │
│ - What you'll practice                                   │
│ - Target university level                                │
│ - Prerequisites                                          │
│                                                          │
│ === サンプル問題 Tab ===                                  │
│ Preview of 1-2 questions (read-only)                     │
│                                                          │
│ === レビュー Tab ===                                      │
│ Rating summary + review list                             │
│                                                          │
│ === Q&A Tab ===                                          │
│ Questions and answers from purchasers                    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ 関連する問題セット                                       │
│ [Card] [Card] [Card] [Card]                              │
├─────────────────────────────────────────────────────────┤
│ Footer                                                   │
└─────────────────────────────────────────────────────────┘
```

### Purchase States
| State | UI |
|-------|-----|
| Not purchased, not authenticated | "ログインして購入" button → `/login?next=/problem/[id]` |
| Not purchased, authenticated | "購入する" button → Stripe Checkout (or instant for free) |
| Purchased | "解く" button → `/problem/[id]/solve` + "結果を見る" if has submissions |
| Own problem set (seller) | "編集" button → `/sell/[id]/edit` |

### Tabs
1. **概要 (Overview):** Seller's description, target info, problem count/points
2. **サンプル問題 (Sample Questions):** 1-2 preview questions (configured by seller)
3. **レビュー (Reviews):** Rating summary + review list (see REV spec)
4. **Q&A:** Questions and answers (see QNA spec)

## 6. Purchase Flow (MKT-014, MKT-015)

### Paid Purchase
1. Click "購入する"
2. Server creates Stripe Checkout session:
   - `line_items`: problem set name + price
   - `payment_intent_data.application_fee_amount`: 15% of price
   - `payment_intent_data.transfer_data.destination`: seller's Connect account
   - `success_url`: `/purchase/success?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url`: `/problem/[id]`
3. Redirect to Stripe Checkout
4. On success: webhook creates `purchases` record
5. Redirect to success page with "Start solving" CTA

### Free Purchase
1. Click "無料で入手"
2. Server action creates `purchases` record directly (no Stripe)
3. Redirect to problem set page with "解く" button now visible

### Purchase Success Page (`/purchase/success`)
```
┌──────────────────────────────┐
│ ✅ 購入完了                   │
│                              │
│ [Problem Set Title]          │
│ をご購入いただきありがとう   │
│ ございます！                 │
│                              │
│ [今すぐ解く]  [マイページへ] │
└──────────────────────────────┘
```

## 7. Favorites/Wishlist (MKT-017)

### Behavior
- Heart icon on problem set cards and detail page
- Toggle: click to add/remove from favorites
- Optimistic UI update
- Auth required (prompt login if not authenticated)
- List at `/dashboard/favorites` with same card grid as browse

## 8. Search (MKT-003)

### Autocomplete
- Debounced input (300ms)
- Search across: problem_sets.title, problem_sets.description, seller_display_name
- Show top 5 suggestions with type label ("問題セット" or "出品者")
- Click suggestion → navigate to detail page
- Press Enter → navigate to `/explore?q={query}`

### Full-Text Search
- Supabase full-text search (`to_tsvector('japanese', ...)`)
- Or: Supabase `ilike` with trigram index for Japanese
- Results highlighted with matched terms

## 9. Content Reporting (MKT-028)

### Report Dialog
- Reason categories: 著作権侵害 (copyright), 不適切な内容 (inappropriate), スパム (spam), その他 (other)
- Optional description text
- Submit → creates record in `reports` table
- Admin notification
- Reporter sees: "報告を受け付けました。審査いたします。"

## 10. Database Queries

### Browse Page Query
```sql
SELECT
  ps.id, ps.title, ps.subject, ps.difficulty, ps.price,
  ps.cover_image_url, ps.created_at,
  sp.seller_display_name, sp.university,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(DISTINCT r.id) as review_count,
  COUNT(DISTINCT p.id) as purchase_count
FROM problem_sets ps
JOIN seller_profiles sp ON ps.seller_id = sp.id
LEFT JOIN reviews r ON r.problem_set_id = ps.id
LEFT JOIN purchases p ON p.problem_set_id = ps.id
WHERE ps.status = 'published'
  AND ($subject IS NULL OR ps.subject = $subject)
  AND ($difficulty IS NULL OR ps.difficulty = $difficulty)
  AND ($min_price IS NULL OR ps.price >= $min_price)
  AND ($max_price IS NULL OR ps.price <= $max_price)
GROUP BY ps.id, sp.id
HAVING ($min_rating IS NULL OR AVG(r.rating) >= $min_rating)
ORDER BY purchase_count DESC
LIMIT 20 OFFSET $offset;
```
