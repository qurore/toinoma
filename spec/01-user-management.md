# User Management — Detailed Specification

> **Features:** USR-001 through USR-017 | **Priority:** Mostly P0

## 1. Overview

All users are equal — there is no "role" column. Seller capability is additive (opt-in via seller onboarding). Every authenticated user can browse, purchase, solve, and manage favorites. Seller features are layered on top.

## 2. Authentication (USR-001 to USR-003)

### OAuth Providers
| Provider | Status | Config |
|----------|--------|--------|
| Google | Implemented | Supabase Auth + Google Cloud Console |
| X (Twitter) | Implemented | Supabase Auth + Twitter Developer Portal |

### Flow
1. User clicks "ログイン" or "無料で始める"
2. Redirect to `/login` page
3. User clicks Google or X button
4. Supabase Auth redirects to OAuth provider
5. Provider authenticates → callback to `/auth/callback`
6. `/auth/callback` exchanges code for session
7. Trigger `on_auth_user_created` auto-creates `profiles` record
8. Redirect to `/dashboard` (or `next` URL if provided)

### Login Page UI
```
┌──────────────────────────────────────┐
│           問の間 TOINOMA             │
│                                      │
│    大学受験の問題と出会う場所         │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  🔵 Googleでログイン         │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │  ✖ X (Twitter)でログイン     │    │
│  └──────────────────────────────┘    │
│                                      │
│  ログインすることで、利用規約と       │
│  プライバシーポリシーに同意します     │
└──────────────────────────────────────┘
```

## 3. User Profile (USR-004, USR-005)

### Profile Data
| Field | Source | Editable |
|-------|--------|----------|
| display_name | OAuth metadata (auto-filled) | Yes |
| avatar_url | OAuth metadata (auto-filled) | Yes (upload) |
| email | OAuth provider | No (display only) |

### Profile Edit Page (`/settings/profile`)
- Display name input (1-50 chars)
- Avatar: current avatar preview + upload button
- Email: display only (from OAuth)
- Save button with loading state

## 4. Account Settings (`/settings`) (USR-006)

### Settings Hub Structure
```
/settings
├── /settings/profile        Profile editing
├── /settings/notifications  Notification preferences
├── /settings/subscription   Subscription management
├── /settings/seller         Seller profile (if seller)
└── /settings (bottom)       Account deletion
```

### Sidebar Navigation
- Desktop: vertical sidebar (left)
- Mobile: horizontal tabs (top, scrollable)
- Items: プロフィール, 通知設定, サブスクリプション, 出品者情報 (conditional), 退会

## 5. Notification Preferences (USR-008, USR-009)

### Categories
| Category | Email | In-App | Default |
|----------|-------|--------|---------|
| Purchase confirmations | ✅ | ✅ | Both ON |
| Grading complete | ✅ | ✅ | Both ON |
| Seller announcements | ✅ | ✅ | Both ON |
| New reviews (seller) | ✅ | ✅ | Both ON |
| Q&A notifications | ❌ | ✅ | In-app ON |
| Subscription reminders | ✅ | ✅ | Both ON |
| Marketing | ✅ | ❌ | OFF |

### UI
Toggle switches per category per channel (email, in-app). Saved immediately on toggle (optimistic update).

## 6. Account Deletion (USR-007)

### Flow
1. Navigate to `/settings` → scroll to bottom → "退会" section
2. Click "アカウントを削除" (destructive button)
3. Confirmation dialog:
   - Warning text explaining consequences
   - Type "退会" to confirm
   - Final "削除する" button
4. On confirm:
   - Cancel active subscriptions
   - Anonymize personal data (APPI compliance)
   - Soft-delete: mark profile as deleted, retain anonymized records
   - Sign out
   - Redirect to `/`

### APPI Compliance
- Display name → "退会済みユーザー"
- Avatar → default placeholder
- Email → cleared from profiles (kept in auth for 30 days, then hard deleted)
- Purchases, submissions → retained with anonymized user_id
- Seller content → unpublished, retained for existing purchasers

## 7. User Dashboard (USR-010, USR-011)

### Dashboard Overview (`/dashboard`)
```
┌─────────────────────────────────────────────────┐
│ AppNavbar                                        │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │ Dashboard                             │
│          │                                      │
│ ダッシュ │ Welcome, [Name]!                     │
│ ボード   │                                      │
│          │ ┌───────┬───────┬───────┬───────┐    │
│ 履歴     │ │Purchased│Solved│Avg    │Streak │   │
│          │ │  12    │  8   │ 73%   │ 5日   │   │
│ お気に入り│ └───────┴───────┴───────┴───────┘   │
│          │                                      │
│ コレクシ │ Continue Studying                     │
│ ョン     │ ┌──────────────────────────────┐     │
│          │ │ [Set A] Last: 72/100 [続ける] │    │
│ 設定     │ │ [Set B] Last: 85/100 [続ける] │    │
│          │ └──────────────────────────────┘     │
│          │                                      │
│          │ Recent Activity                       │
│          │ • Solved "Math Set 3" — 85/100       │
│          │ • Purchased "Physics Set 1"          │
│          │ • Added "History Q12" to collection  │
│          │                                      │
│          │ Recommended for You                   │
│          │ [Problem Set Cards Grid]              │
└──────────┴──────────────────────────────────────┘
```

### Stats Cards
| Card | Data | Icon |
|------|------|------|
| Purchased | Total purchased problem sets | ShoppingBag |
| Solved | Problem sets with at least 1 submission | CheckCircle |
| Average Score | Average score across all submissions | Target |
| Study Streak | Consecutive days with at least 1 submission | Flame |

### Continue Studying Section
- Top 3 most recent purchased-but-not-completed problem sets
- Shows last score (or "Not started")
- "続ける" button links to solve page

### Recent Activity Feed
- Last 10 activities: purchases, submissions, favorites, collection additions
- Relative timestamps ("2時間前", "昨日")

## 8. Purchase History (USR-010)

### `/dashboard/history`
- List of all purchases with:
  - Problem set title + subject badge
  - Purchase date
  - Amount paid (¥0 for free)
  - Submission count + best score
  - Actions: Solve, Review, PDF
- Filter by subject, date range
- Sort by date (newest/oldest), score

## 9. Onboarding Welcome Flow (USR-017)

### First Login Experience
1. After first OAuth sign-in, redirect to `/welcome`
2. Step 1: Set display name (pre-filled from OAuth)
3. Step 2: Choose subjects of interest (multi-select from 9 subjects)
4. Step 3: Set study goal (e.g., target university, target score)
5. Complete → redirect to `/dashboard`

Optional — can be skipped. Data used for:
- Personalized recommendations on landing page
- Subject-filtered browse default
- Study plan suggestions (P3)
