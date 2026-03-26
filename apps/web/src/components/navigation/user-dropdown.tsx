"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { SubscriptionTier } from "@/types/database";

interface UserDropdownProps {
  user: Pick<SupabaseUser, "id" | "email">;
  isSeller: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionTier: SubscriptionTier;
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "フリー",
  basic: "ベーシック",
  pro: "プロ",
};

const TIER_BADGE_VARIANTS: Record<SubscriptionTier, "secondary" | "default" | "outline"> = {
  free: "secondary",
  basic: "default",
  pro: "outline",
};

export function UserDropdown({
  user,
  isSeller,
  displayName,
  avatarUrl,
  subscriptionTier,
}: UserDropdownProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("ログアウトに失敗しました");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  const initials = (displayName ?? user.email ?? "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-full outline-none ring-2 ring-transparent transition-all hover:ring-primary/30 focus-visible:ring-primary/50"
          aria-label="ユーザーメニューを開く"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? "User"} />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User identity header with subscription badge */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1.5">
            <p className="truncate text-sm font-semibold leading-none">
              {displayName ?? user.email}
            </p>
            {subscriptionTier !== "free" && (
              <Badge
                variant={TIER_BADGE_VARIANTS[subscriptionTier]}
                className="w-fit px-1.5 py-0 text-xs"
              >
                {TIER_LABELS[subscriptionTier]}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Primary navigation */}
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            マイページ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            設定
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Seller mode — link depends on seller status */}
        <DropdownMenuItem asChild>
          <Link
            href={isSeller ? "/seller" : "/seller/onboarding"}
            className="cursor-pointer font-medium"
            data-testid="seller-link"
          >
            {isSeller ? "出品者モード" : "出品者になる"}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
