import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { UserDropdown } from "./user-dropdown";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SearchAutocomplete } from "@/components/marketplace/search-autocomplete";
import { NavLinkClient } from "./nav-item-client";
import type { SubscriptionTier } from "@/types/database";

interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NavbarData {
  user: { id: string; email?: string } | null;
  isSeller: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionTier: SubscriptionTier;
  notificationCount: number;
  notifications: NotificationData[];
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
    return {
      user: null, isSeller: false, displayName: null, avatarUrl: null,
      subscriptionTier: "free", notificationCount: 0, notifications: [],
    };
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

  // Fetch notifications (gracefully handle missing table)
  let notificationCount = 0;
  let notifications: NotificationData[] = [];
  try {
    const [countResult, listResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
      supabase
        .from("notifications")
        .select("id, type, title, body, link, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    notificationCount = countResult.count ?? 0;
    notifications = (listResult.data ?? []) as NotificationData[];
  } catch {
    // Table may not exist yet — graceful degradation
  }

  return {
    user: { id: user.id, email: user.email },
    isSeller,
    displayName: profileResult.data?.display_name ?? null,
    avatarUrl: profileResult.data?.avatar_url ?? null,
    subscriptionTier: (subResult.data?.tier ?? "free") as SubscriptionTier,
    notificationCount,
    notifications,
  };
}

/**
 * AppNavbar — Server Component.
 * Clean, Udemy-style navigation: logo | search | text links | actions.
 * Receives auth/profile data from the calling layout via getNavbarData().
 */
export function AppNavbar({
  user, isSeller, displayName, avatarUrl, subscriptionTier,
  notificationCount, notifications,
}: NavbarData) {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col leading-none">
            <span className="font-display text-base font-bold text-foreground">問の間</span>
            <span className="text-[9px] font-medium tracking-wider text-foreground/50">
              TOINOMA
            </span>
          </div>
        </Link>

        {/* Desktop text links — clean, no icons */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="メインナビゲーション">
          <NavLinkClient href="/explore" label="問題を探す" />
          <NavLinkClient href="/rankings" label="ランキング" />
          {user && <NavLinkClient href="/dashboard" label="マイページ" />}
        </nav>

        {/* Search — client component with autocomplete */}
        <SearchAutocomplete className="ml-auto hidden max-w-xs flex-1 sm:flex" />

        {/* Right-side actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
          {user ? (
            <>
              <NotificationBell
                initialCount={notificationCount}
                initialNotifications={notifications}
              />
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
                <Link href="/signup">無料で始める</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
