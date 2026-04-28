#!/usr/bin/env bash
# Forbid raw `.tier` reads from user_subscriptions outside whitelisted files.
# Every tier-gated decision MUST go through `getResolvedTier()` from @toinoma/shared
# so manual admin overrides take precedence over Stripe-driven values.
#
# Whitelisted files (allowed to read raw `tier`):
#   - apps/web/src/app/api/webhooks/stripe/route.ts (writes raw tier)
#   - apps/web/src/app/admin/users/[id]/actions.ts (admin override action; reads tier for audit metadata)
#   - apps/web/src/app/admin/users/[id]/admin-user-detail-client.tsx (displays raw vs resolved side-by-side)
#   - apps/web/src/app/admin/users/[id]/page.tsx (passes both raw and resolved to client)
#   - apps/web/src/app/admin/users/page.tsx (selects raw + override; resolves before passing to client)
#   - apps/web/src/app/admin/users/admin-users-client.tsx (renders resolved tier badge — column name is u.tier from server)
#   - apps/web/src/app/admin/page.tsx (dashboard count via resolver)
#   - apps/web/src/app/admin/announcements/actions.ts (subscriber filter via resolver)
#   - apps/web/src/lib/subscription.ts (canonical state resolver caller)
#   - apps/web/src/lib/ai/usage-manager.ts (budget calc — uses resolver)
#   - packages/shared/src/utils/resolved-tier.ts (the resolver itself)
#   - packages/shared/src/types/database.ts (type definition)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

WHITELIST=(
  "apps/web/src/app/api/webhooks/stripe/route.ts"
  "apps/web/src/app/admin/users/\[id\]/actions.ts"
  "apps/web/src/app/admin/users/\[id\]/admin-user-detail-client.tsx"
  "apps/web/src/app/admin/users/\[id\]/page.tsx"
  "apps/web/src/app/admin/users/page.tsx"
  "apps/web/src/app/admin/users/admin-users-client.tsx"
  "apps/web/src/app/admin/page.tsx"
  "apps/web/src/app/admin/announcements/actions.ts"
  "apps/web/src/lib/subscription.ts"
  "apps/web/src/lib/ai/usage-manager.ts"
  "apps/web/src/components/navigation/app-navbar.tsx"
  "packages/shared/src/utils/resolved-tier.ts"
  "packages/shared/src/types/database.ts"
)

EXCLUDE_REGEX=$(printf "|%s" "${WHITELIST[@]}")
EXCLUDE_REGEX="${EXCLUDE_REGEX:1}"

# Find offenders: any source file that references `.tier` from a user_subscriptions row
# and is not in the whitelist. We grep for explicit patterns to reduce false positives.
OFFENDERS=$(
  grep -rEn \
    --include="*.ts" --include="*.tsx" \
    --exclude-dir="node_modules" --exclude-dir=".next" --exclude-dir=".turbo" --exclude-dir="dist" \
    -e 'user_subscriptions[^"]*"[^"]*\btier\b' \
    -e 'subscription\.tier\b' \
    -e '\.from\("user_subscriptions"\)\.[a-z]*\([^)]*"tier"' \
    "$ROOT/apps" "$ROOT/packages" 2>/dev/null \
  | grep -vE "$EXCLUDE_REGEX" \
  || true
)

if [ -n "$OFFENDERS" ]; then
  echo "ERROR: Raw \`.tier\` read detected outside the resolver whitelist." >&2
  echo "Use getResolvedTier() from @toinoma/shared instead." >&2
  echo >&2
  echo "$OFFENDERS" >&2
  exit 1
fi

echo "OK: All tier reads route through getResolvedTier() or are explicitly whitelisted."
