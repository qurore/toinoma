# Payments — Detailed Specification

> **Features:** PAY-001 through PAY-016 | **Priority:** P0-P2

## 1. Overview

Toinoma uses **Stripe** for all payment processing. Two Stripe products:
- **Stripe Checkout** — One-time problem set purchases
- **Stripe Connect (Express)** — Seller payouts
- **Stripe Billing** — Subscription management (see 08-subscriptions.md)

Platform fee: **15%** (platform bears Stripe processing fees).

## 2. Purchase Flow (PAY-001, PAY-002)

### Paid Purchase
```
Student clicks "購入する" on /problem/[id]
  ↓
Server Action: createCheckoutSession()
  ↓
Stripe Checkout Session created:
  - line_items: [{name: set.title, amount: set.price, currency: 'jpy'}]
  - payment_intent_data:
      application_fee_amount: Math.round(set.price * 0.15)
      transfer_data.destination: seller.stripe_account_id
  - success_url: /purchase/success?session_id={CHECKOUT_SESSION_ID}
  - cancel_url: /problem/{id}
  ↓
Redirect to Stripe Checkout
  ↓
Student pays
  ↓
Stripe webhook: checkout.session.completed
  ↓
Webhook handler:
  1. Verify webhook signature
  2. Extract session data
  3. Create `purchases` record
  4. (Optional) Send confirmation email
  ↓
Student redirected to /purchase/success
```

### Free Purchase
```
Student clicks "無料で入手" on /problem/[id]
  ↓
Server Action: acquireFreeProblemSet(problemSetId)
  ↓
Validate: set.price === 0
  ↓
Insert into `purchases`: { user_id, problem_set_id, amount_paid: 0 }
  ↓
Redirect to /problem/[id] (now shows "解く" button)
```

### Duplicate Purchase Prevention
- `purchases` has UNIQUE(user_id, problem_set_id)
- Server checks existing purchase before creating checkout
- If already purchased: show "購入済み" badge + "解く" button

## 3. Fee Structure (PAY-007, PAY-008)

### Revenue Split
| Component | Amount | Paid By |
|-----------|--------|---------|
| Problem set price | ¥X | Student pays |
| Platform fee | 15% of X | Deducted from seller |
| Stripe fee | 3.6% + ¥40 | Platform bears |
| Seller receives | X - 15% of X | Via Stripe Connect |

### Example: ¥1,500 Problem Set
| Item | Amount |
|------|--------|
| Student pays | ¥1,500 |
| Platform fee (15%) | ¥225 |
| Stripe fee (3.6% + ¥40) | ¥94 |
| Platform net | ¥225 - ¥94 = ¥131 |
| Seller receives | ¥1,275 |

### Implementation
```typescript
// Stripe Checkout session creation
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price_data: {
      currency: 'jpy',
      product_data: { name: problemSet.title },
      unit_amount: problemSet.price,
    },
    quantity: 1,
  }],
  payment_intent_data: {
    application_fee_amount: Math.round(problemSet.price * 0.15),
    transfer_data: {
      destination: sellerProfile.stripe_account_id,
    },
  },
  mode: 'payment',
  success_url: `${APP_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${APP_URL}/problem/${problemSet.id}`,
});
```

## 4. Webhook Handling (PAY-016)

### Endpoint: `/api/webhooks/stripe`

### Handled Events
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create `purchases` record |
| `payment_intent.succeeded` | Update purchase status |
| `payment_intent.payment_failed` | Log failure, notify admin |
| `charge.refunded` | Update purchase, revoke access |
| `account.updated` (Connect) | Update seller Stripe status |
| `customer.subscription.*` | See subscriptions spec |
| `invoice.*` | See subscriptions spec |

### Webhook Security
```typescript
// Verify webhook signature
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
```

### Idempotency
- Check if purchase already exists before creating (idempotent key from Stripe session ID)
- Log all webhook events for debugging

## 5. Refund Policy (PAY-005, PAY-006)

### Policy
- Full refund within 24 hours of purchase if no submissions made
- No refund after submission (content consumed)
- Refund processed via Stripe (admin-initiated)
- Free purchases: no refund applicable

### Refund Flow
1. Student contacts support
2. Admin reviews: purchase date, submission count
3. If eligible: admin initiates refund via Stripe Dashboard or API
4. Webhook `charge.refunded` triggers:
   - Update `purchases.refunded_at`
   - Revoke problem set access
   - Notify student

## 6. Seller Payouts (PAY-007, PAY-009)

### Stripe Connect Express
- Automatic payouts by Stripe (daily/weekly based on Connect settings)
- Sellers manage payout bank account via Stripe Express dashboard
- Platform provides link to Stripe Express dashboard from seller settings

### Payout History Display
```
┌──────────────────────────────────────────────────┐
│ Payouts                                           │
├──────────────────────────────────────────────────┤
│ Date       │ Amount    │ Status    │ Details     │
│ 2026-03-20 │ ¥12,750   │ 振込済み  │ [詳細]     │
│ 2026-03-13 │ ¥8,500    │ 振込済み  │ [詳細]     │
│ 2026-03-06 │ ¥15,300   │ 処理中    │ [詳細]     │
└──────────────────────────────────────────────────┘
```

## 7. Tax Handling (PAY-011)

### Japanese Consumption Tax (消費税)
- All displayed prices are tax-inclusive (内税表示)
- 10% consumption tax included in price
- Invoice shows tax breakdown:
  - 税抜価格: ¥1,364
  - 消費税 (10%): ¥136
  - 合計: ¥1,500

### 特定商取引法 Compliance
- `/legal/tokushoho` page with required disclosures:
  - Business operator name
  - Address (can use representative address)
  - Contact information
  - Pricing details
  - Payment methods accepted
  - Delivery/access timing
  - Return/refund policy
  - Platform operation details

## 8. Coupon System (PAY-012)

### Coupon Model
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,  -- % or JPY amount
  min_purchase INTEGER DEFAULT 0,   -- Minimum purchase amount
  max_uses INTEGER,                 -- NULL = unlimited
  used_count INTEGER NOT NULL DEFAULT 0,
  problem_set_id UUID REFERENCES problem_sets(id),  -- NULL = applies to all seller's sets
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Coupon Application
- Input field on checkout page: "クーポンコードを入力"
- Validate: code exists, not expired, usage limit not reached, applies to this set
- Display: original price → discounted price
- Applied in Stripe Checkout as coupon/discount

## 9. Transaction History — Seller (PAY-015)

### `/sell/transactions`
- All sales transactions: date, problem set, buyer (anonymized), amount, platform fee, net
- Refunds shown as negative entries
- CSV export for accounting
- Date range filter
- Summary: total sales, total refunds, net revenue
