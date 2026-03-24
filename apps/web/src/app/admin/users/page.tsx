import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import { AdminUsersClient } from "./admin-users-client";

export const metadata: Metadata = {
  title: "ユーザー管理 - 問の間",
};

// Shared type for the user row passed to the client component
export interface AdminUserRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  banned_at: string | null;
  suspended_until: string | null;
  ban_reason: string | null;
  is_seller: boolean;
  tier: string;
}

export default async function AdminUsersPage(props: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Admin guard (layout already checks, but defense in depth)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const searchParams = await props.searchParams;
  const rawQuery = searchParams.q ?? "";
  // Escape PostgREST ilike special characters to prevent filter injection
  const query = rawQuery.replace(/[%_\\]/g, (ch) => `\\${ch}`);
  const roleFilter = searchParams.role ?? "all";
  const statusFilter = searchParams.status ?? "all";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const perPage = 20;

  // Use admin client for full access to all profiles
  const admin = createAdminClient();

  // Build query
  let dbQuery = admin
    .from("profiles")
    .select("id, display_name, avatar_url, created_at, banned_at, suspended_until, ban_reason", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  // Search by display_name (ilike)
  if (query) {
    dbQuery = dbQuery.ilike("display_name", `%${query}%`);
  }

  // Status filter
  if (statusFilter === "banned") {
    dbQuery = dbQuery.not("banned_at", "is", null);
  } else if (statusFilter === "suspended") {
    dbQuery = dbQuery.not("suspended_until", "is", null).is("banned_at", null);
  } else if (statusFilter === "active") {
    dbQuery = dbQuery.is("banned_at", null).is("suspended_until", null);
  }

  // Pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  dbQuery = dbQuery.range(from, to);

  const { data: users, count: totalCount } = await dbQuery;

  const userIds = (users ?? []).map((u) => u.id);

  // Fetch seller & subscription status in parallel
  const [sellersResult, subsResult] =
    userIds.length > 0
      ? await Promise.all([
          admin
            .from("seller_profiles")
            .select("id, tos_accepted_at, stripe_account_id")
            .in("id", userIds),
          admin
            .from("user_subscriptions")
            .select("user_id, tier")
            .in("user_id", userIds),
        ])
      : [{ data: [] }, { data: [] }];

  const sellerSet = new Set(
    (sellersResult.data ?? [])
      .filter((s) => s.tos_accepted_at)
      .map((s) => s.id)
  );
  const subMap = new Map(
    (subsResult.data ?? []).map((s) => [s.user_id, s.tier])
  );

  // Build rows
  const rows: AdminUserRow[] = (users ?? []).map((u) => ({
    id: u.id,
    display_name: u.display_name,
    avatar_url: u.avatar_url,
    created_at: u.created_at,
    banned_at: u.banned_at,
    suspended_until: u.suspended_until,
    ban_reason: u.ban_reason,
    is_seller: sellerSet.has(u.id),
    tier: subMap.get(u.id) ?? "free",
  }));

  // Apply client-side role filter (sellers / subscribers)
  let filteredRows = rows;
  if (roleFilter === "sellers") {
    filteredRows = rows.filter((r) => r.is_seller);
  } else if (roleFilter === "subscribers") {
    filteredRows = rows.filter(
      (r) => r.tier === "basic" || r.tier === "pro"
    );
  }

  const totalPages = Math.ceil((totalCount ?? 0) / perPage);

  return (
    <AdminUsersClient
      users={filteredRows}
      query={rawQuery}
      roleFilter={roleFilter}
      statusFilter={statusFilter}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount ?? 0}
    />
  );
}
