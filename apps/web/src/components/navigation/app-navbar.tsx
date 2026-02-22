import Link from "next/link";
import { BookOpen, Grid2x2, House, LayoutDashboard, Plus, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { UserDropdown } from "./user-dropdown";
import type { SubscriptionTier } from "@/types/database";

export interface NavbarData {
  user: { id: string; email?: string } | null;
  isSeller: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionTier: SubscriptionTier;
}

/**
 * Fetch all data needed to render the AppNavbar.
 * Called once per layout to avoid N+1 auth queries.
 */
export async function getNavbarData(): Promise<NavbarData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isSeller: false, displayName: null, avatarUrl: null, subscriptionTier: "free" };
  }

  const [profileResult, sellerResult, subResult] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    supabase
      .from("seller_profiles")
      .select("tos_accepted_at, stripe_account_id")
      .eq("id", user.id)
      .single(),
    supabase.from("user_subscriptions").select("tier").eq("user_id", user.id).single(),
  ]);

  const isSeller =
    !!sellerResult.data?.tos_accepted_at && !!sellerResult.data?.stripe_account_id;

  return {
    user: { id: user.id, email: user.email },
    isSeller,
    displayName: profileResult.data?.display_name ?? null,
    avatarUrl: profileResult.data?.avatar_url ?? null,
    subscriptionTier: (subResult.data?.tier ?? "free") as SubscriptionTier,
  };
}

interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function NavItem({ href, icon: Icon, label }: NavItemProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:text-foreground"
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

/**
 * AppNavbar — Server Component.
 * Receives auth/profile data from the calling layout via getNavbarData().
 */
export function AppNavbar({ user, isSeller, displayName, avatarUrl, subscriptionTier }: NavbarData) {
  const createHref = isSeller ? "/sell/new" : "/sell/onboarding";

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <div className="flex flex-col leading-none">
            <span className="font-display text-base font-bold text-foreground">問の間</span>
            <span className="text-[9px] font-medium tracking-wider text-foreground/50">
              TOINOMA
            </span>
          </div>
        </Link>

        {/* Search — plain form, no client component needed */}
        <form action="/explore" method="GET" className="flex-1 max-w-sm">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              name="q"
              type="search"
              aria-label="問題を検索"
              placeholder="問題を検索..."
              className="w-full rounded-full border border-border bg-muted/50 py-1.5 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-foreground/40 focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </form>

        {/* Nav items — hidden on mobile */}
        <nav className="hidden items-center md:flex" aria-label="メインナビゲーション">
          <NavItem href="/" icon={House} label="ホーム" />
          <NavItem href="/explore" icon={Grid2x2} label="問題を探す" />
          <NavItem href="/dashboard" icon={LayoutDashboard} label="マイページ" />
          {isSeller && <NavItem href="/sell" icon={Store} label="出品管理" />}
        </nav>

        {/* Right-side actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {user ? (
            <>
              {isSeller && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden items-center gap-1.5 sm:flex"
                  asChild
                >
                  <Link href={createHref}>
                    <Plus className="h-3.5 w-3.5" />
                    出題する
                  </Link>
                </Button>
              )}
              <UserDropdown
                user={user}
                isSeller={isSeller}
                displayName={displayName}
                avatarUrl={avatarUrl}
                subscriptionTier={subscriptionTier}
              />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">ログイン</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login">無料で始める</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
