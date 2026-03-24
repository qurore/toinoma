"use server";

import { createClient } from "@/lib/supabase/server";
import { calculatePlatformFee } from "@toinoma/shared/utils";

export interface TransactionRow {
  id: string;
  date: string;
  buyer_initial: string;
  problem_set_title: string;
  problem_set_id: string;
  amount_paid: number;
  platform_fee: number;
  net_revenue: number;
  coupon_code: string | null;
  discount_amount: number;
}

export interface TransactionSummary {
  total_revenue: number;
  total_fees: number;
  net_earnings: number;
  total_transactions: number;
}

export interface TransactionsResult {
  transactions: TransactionRow[];
  summary: TransactionSummary;
  total_count: number;
  page: number;
  total_pages: number;
  error?: string;
}

/**
 * Fetch paginated transactions for a seller's problem sets.
 */
export async function getTransactions(
  sellerId: string,
  startDate: string | null,
  endDate: string | null,
  page: number
): Promise<TransactionsResult> {
  const supabase = await createClient();
  const perPage = 20;

  // Fetch all problem set IDs owned by this seller
  const { data: sellerSets } = await supabase
    .from("problem_sets")
    .select("id, title")
    .eq("seller_id", sellerId);

  const sets = sellerSets ?? [];
  if (sets.length === 0) {
    return {
      transactions: [],
      summary: { total_revenue: 0, total_fees: 0, net_earnings: 0, total_transactions: 0 },
      total_count: 0,
      page: 1,
      total_pages: 0,
    };
  }

  const setIds = sets.map((s) => s.id);
  const setTitleMap = new Map(sets.map((s) => [s.id, s.title]));

  // Build the purchases query with optional date filters
  let countQuery = supabase
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .in("problem_set_id", setIds);

  let dataQuery = supabase
    .from("purchases")
    .select("id, user_id, problem_set_id, amount_paid, coupon_id, discount_amount, created_at")
    .in("problem_set_id", setIds)
    .order("created_at", { ascending: false });

  // Also build a query for summary (all matching, no pagination)
  let summaryQuery = supabase
    .from("purchases")
    .select("id, amount_paid, discount_amount")
    .in("problem_set_id", setIds);

  if (startDate) {
    const start = `${startDate}T00:00:00.000Z`;
    countQuery = countQuery.gte("created_at", start);
    dataQuery = dataQuery.gte("created_at", start);
    summaryQuery = summaryQuery.gte("created_at", start);
  }
  if (endDate) {
    const end = `${endDate}T23:59:59.999Z`;
    countQuery = countQuery.lte("created_at", end);
    dataQuery = dataQuery.lte("created_at", end);
    summaryQuery = summaryQuery.lte("created_at", end);
  }

  // Pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  dataQuery = dataQuery.range(from, to);

  // Execute all queries in parallel
  const [countResult, dataResult, summaryResult] = await Promise.all([
    countQuery,
    dataQuery,
    summaryQuery,
  ]);

  const totalCount = countResult.count ?? 0;
  const purchases = dataResult.data ?? [];
  const allForSummary = summaryResult.data ?? [];

  // Fetch buyer display names for privacy-masked display
  const buyerIds = [...new Set(purchases.map((p) => p.user_id))];
  const { data: buyerProfiles } =
    buyerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", buyerIds)
      : { data: [] };

  const buyerNameMap = new Map(
    (buyerProfiles ?? []).map((p) => [p.id, p.display_name])
  );

  // Fetch coupon codes if any purchases used coupons
  const couponIds = [
    ...new Set(
      purchases
        .map((p) => p.coupon_id)
        .filter((id): id is string => id !== null)
    ),
  ];
  const { data: coupons } =
    couponIds.length > 0
      ? await supabase
          .from("coupons")
          .select("id, code")
          .in("id", couponIds)
      : { data: [] };

  const couponCodeMap = new Map(
    (coupons ?? []).map((c) => [c.id, c.code])
  );

  // Build transaction rows
  const transactions: TransactionRow[] = purchases.map((p) => {
    const buyerName = buyerNameMap.get(p.user_id);
    const initial = buyerName ? buyerName.charAt(0) : "?";
    const fee = calculatePlatformFee(p.amount_paid);

    return {
      id: p.id,
      date: p.created_at,
      buyer_initial: initial,
      problem_set_title: setTitleMap.get(p.problem_set_id) ?? "—",
      problem_set_id: p.problem_set_id,
      amount_paid: p.amount_paid,
      platform_fee: fee,
      net_revenue: p.amount_paid - fee,
      coupon_code: p.coupon_id ? (couponCodeMap.get(p.coupon_id) ?? null) : null,
      discount_amount: p.discount_amount ?? 0,
    };
  });

  // Calculate summary from all matching purchases (not just current page)
  const totalRevenue = allForSummary.reduce(
    (sum, p) => sum + (p.amount_paid ?? 0),
    0
  );
  const totalFees = allForSummary.reduce(
    (sum, p) => sum + calculatePlatformFee(p.amount_paid ?? 0),
    0
  );

  return {
    transactions,
    summary: {
      total_revenue: totalRevenue,
      total_fees: totalFees,
      net_earnings: totalRevenue - totalFees,
      total_transactions: allForSummary.length,
    },
    total_count: totalCount,
    page,
    total_pages: Math.ceil(totalCount / perPage),
  };
}

/**
 * Generate a CSV string of all transactions within a date range for a seller.
 */
export async function exportTransactionsCsv(
  sellerId: string,
  startDate: string | null,
  endDate: string | null
): Promise<{ csv?: string; error?: string }> {
  const supabase = await createClient();

  // Verify the caller is the seller
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== sellerId) {
    return { error: "認証が必要です" };
  }

  // Fetch all problem sets for this seller
  const { data: sellerSets } = await supabase
    .from("problem_sets")
    .select("id, title")
    .eq("seller_id", sellerId);

  const sets = sellerSets ?? [];
  if (sets.length === 0) return { csv: "" };

  const setIds = sets.map((s) => s.id);
  const setTitleMap = new Map(sets.map((s) => [s.id, s.title]));

  // Fetch all purchases within date range
  let query = supabase
    .from("purchases")
    .select("id, user_id, problem_set_id, amount_paid, coupon_id, discount_amount, created_at")
    .in("problem_set_id", setIds)
    .order("created_at", { ascending: false });

  if (startDate) query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte("created_at", `${endDate}T23:59:59.999Z`);

  const { data: purchases } = await query;
  const allPurchases = purchases ?? [];

  if (allPurchases.length === 0) return { csv: "" };

  // Fetch coupon codes
  const couponIds = [
    ...new Set(
      allPurchases
        .map((p) => p.coupon_id)
        .filter((id): id is string => id !== null)
    ),
  ];
  const { data: coupons } =
    couponIds.length > 0
      ? await supabase.from("coupons").select("id, code").in("id", couponIds)
      : { data: [] };

  const couponCodeMap = new Map(
    (coupons ?? []).map((c) => [c.id, c.code])
  );

  // Build CSV with BOM for Excel compatibility
  const BOM = "\uFEFF";
  const headers = [
    "日付",
    "問題セット",
    "売上金額",
    "プラットフォーム手数料",
    "手取り金額",
    "クーポンコード",
    "割引額",
  ];

  const rows = allPurchases.map((p) => {
    const fee = calculatePlatformFee(p.amount_paid);
    const dateStr = new Date(p.created_at).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return [
      dateStr,
      `"${(setTitleMap.get(p.problem_set_id) ?? "—").replace(/"/g, '""')}"`,
      p.amount_paid,
      fee,
      p.amount_paid - fee,
      p.coupon_id ? (couponCodeMap.get(p.coupon_id) ?? "") : "",
      p.discount_amount ?? 0,
    ].join(",");
  });

  const csv = BOM + headers.join(",") + "\n" + rows.join("\n");
  return { csv };
}
