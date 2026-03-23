# Subscriptions — Detailed Specification

> **Features:** SUB-001 through SUB-016 | **Priority:** P0-P1

## 1. Overview

Toinoma offers three subscription tiers that gate AI-powered features. All users start on the Free tier. Subscriptions are managed via **Stripe Billing**.

## 2. Tier Definition

| Feature | Free | Basic (¥500/mo) | Pro (¥2,000/mo) |
|---------|------|-----------------|-----------------|
| Browse & purchase | ✅ | ✅ | ✅ |
| Solve problem sets | ✅ | ✅ | ✅ |
| AI gradings / month | 3 | 30 | Unlimited |
| Priority grading queue | ❌ | ✅ | ✅ |
| AI study assistant | ❌ | ❌ | ✅ |
| Advanced analytics | ❌ | ❌ | ✅ |
| PDF export | ✅ | ✅ | ✅ |
| Collections | 3 max | 20 max | Unlimited |
| Annual price | - | ¥5,000/yr | ¥20,000/yr |
| Annual savings | - | 2 months free | 2 months free |

## 3. Subscription Page (SUB-005)

### URL: `/settings/subscription`

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ Your Plan                                                │
│                                                          │
│ Current: [Basic Plan Badge]  ¥500/月                    │
│ Next billing: 2026-04-23                                │
│ Usage: 12/30 AI gradings this period                    │
│ ██████████████░░░░░░░░░░░░░░ 40%                       │
│                                                          │
│ [Manage billing] [Cancel plan]                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│ │ Free         │  │ Basic       │  │ Pro          │     │
│ │              │  │ ¥500/月     │  │ ¥2,000/月   │     │
│ │ ¥0           │  │ ¥5,000/年  │  │ ¥20,000/年  │     │
│ │              │  │             │  │              │     │
│ │ AI採点 3回   │  │ AI採点 30回 │  │ AI採点 無制限│     │
│ │ コレクション │  │ 優先採点    │  │ AI学習アシス │     │
│ │ 3つまで      │  │ コレクション│  │ タント       │     │
│ │              │  │ 20まで      │  │ 詳細分析     │     │
│ │              │  │             │  │ コレクション │     │
│ │ [Current]    │  │ [Upgrade]   │  │ [Upgrade]    │     │
│ └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│ [月額] [年額 (2ヶ月お得)]  ← interval toggle            │
└─────────────────────────────────────────────────────────┘
```

### Interval Toggle
- Monthly / Annual toggle switch
- Annual shows savings: "年額プランなら2ヶ月分お得！"
- Prices update dynamically

## 4. Upgrade Flow (SUB-006)

### New Subscription (Free → Paid)
1. Click "アップグレード" on desired plan
2. Select interval (monthly / annual)
3. Redirect to Stripe Checkout (subscription mode)
4. Complete payment
5. Webhook creates/updates `user_subscriptions` record
6. Redirect to `/settings/subscription` with success toast

### Plan Change (Basic → Pro)
1. Click "アップグレード" on Pro plan
2. Confirmation dialog: "Basic → Proへ変更します。差額は日割り計算されます。"
3. Stripe updates subscription (proration)
4. Webhook updates `user_subscriptions.tier`
5. Immediate access to Pro features

## 5. Downgrade Flow (SUB-007)

1. Click "プランを変更" → select lower tier
2. Confirmation dialog:
   - "現在のBillingCycle終了後にFreeプランに変更されます"
   - "以下の機能が制限されます: [list of losing features]"
   - "コレクションが3つを超えている場合、追加分は閲覧のみとなります"
3. Stripe sets `cancel_at_period_end` (or schedule downgrade)
4. Current tier maintained until period end
5. Dashboard shows: "2026-04-23にFreeプランに変更されます"

## 6. Cancellation Flow (SUB-008)

1. Click "プランをキャンセル"
2. Retention step: "本当にキャンセルしますか？"
   - Show remaining benefits: "あと18回のAI採点が残っています"
   - Offer: "年額プランなら33%お得です" (if monthly)
3. Confirm cancellation
4. `cancel_at_period_end = true` in Stripe
5. Access continues until period end
6. Dashboard shows cancellation notice with end date
7. Re-subscribe button available

## 7. Usage Tracking (SUB-009, SUB-015)

### Tracking
- Each AI grading request increments counter in `token_usage` table
- Count resets at billing period start
- Dashboard widget: "12/30 AI採点を使用済み"
- Warning at 80%: "残りのAI採点回数が少なくなっています"
- At 100%: "今月のAI採点回数の上限に達しました" + upgrade prompt

### Limit Enforcement
```typescript
async function checkGradingLimit(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  const limit = TIER_LIMITS[sub.tier]; // { free: 3, basic: 30, pro: Infinity }

  if (limit === Infinity) return true;

  const usage = await getMonthlyGradingCount(userId, sub.current_period_start);
  return usage < limit;
}
```

### Feature Gating Middleware
```typescript
// Used in API routes and server actions
export async function requireTier(userId: string, minimumTier: SubscriptionTier) {
  const sub = await getUserSubscription(userId);
  const tierOrder = { free: 0, basic: 1, pro: 2 };

  if (tierOrder[sub.tier] < tierOrder[minimumTier]) {
    throw new Error('TIER_INSUFFICIENT');
  }
}
```

## 8. AI Study Assistant (SUB-010)

### Pro-Only Feature

Chat interface where students can:
- Ask questions about specific problems
- Request hints without seeing full answer
- Get concept explanations related to the problem
- Ask for alternative solution approaches

### UI: Chat Panel
```
┌──────────────────────────────┐
│ AI学習アシスタント      [×]  │
├──────────────────────────────┤
│                              │
│ [Student]: この問題の         │
│ ヒントをください              │
│                              │
│ [AI]: この問題では、二次関数  │
│ の頂点の座標を求めることが    │
│ ポイントです。平方完成を      │
│ 使ってみましょう。            │
│                              │
│ [Student]: 平方完成の         │
│ やり方を教えてください        │
│                              │
│ [AI]: x² + 4x + 3 を         │
│ 平方完成すると...             │
│ $$ (x+2)^2 - 1 $$            │
│                              │
├──────────────────────────────┤
│ [Message input...]    [Send] │
└──────────────────────────────┘
```

### Implementation
- Vercel AI SDK `useChat` hook
- Context: current problem set + question being viewed
- System prompt includes problem content + rubric (without answer)
- AI instructed to give hints, not full answers
- Token usage tracked per conversation
- Rate limited: 50 messages/day for Pro users

## 9. Stripe Billing Integration (SUB-011, SUB-012)

### Stripe Products
| Product | Price ID | Amount | Interval |
|---------|----------|--------|----------|
| Basic Monthly | `price_basic_monthly` | ¥500 | month |
| Basic Annual | `price_basic_annual` | ¥5,000 | year |
| Pro Monthly | `price_pro_monthly` | ¥2,000 | month |
| Pro Annual | `price_pro_annual` | ¥20,000 | year |

### Webhook Events
| Event | Action |
|-------|--------|
| `customer.subscription.created` | Create `user_subscriptions` record |
| `customer.subscription.updated` | Update tier, interval, period dates |
| `customer.subscription.deleted` | Set tier to 'free', clear Stripe fields |
| `invoice.payment_succeeded` | Update `current_period_start/end`, reset usage |
| `invoice.payment_failed` | Set status to 'past_due', notify user |

### Grace Period (SUB-013)
- On `invoice.payment_failed`: status → 'past_due'
- 3-day grace period before downgrade
- Retry notifications: Day 1, Day 2, Day 3
- After 3 days: cancel subscription, downgrade to free
