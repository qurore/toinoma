import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SellerVerificationControls } from "./seller-verification-controls";

// ──────────────────────────────────────────────
// ADM-006: Seller verification management page
// ──────────────────────────────────────────────

interface SellerRow {
  id: string;
  seller_display_name: string | null;
  seller_description: string | null;
  university: string | null;
  circle_name: string | null;
  stripe_account_id: string | null;
  tos_accepted_at: string | null;
  created_at: string;
  verified_at?: string | null;
}

export default async function AdminSellersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify admin access
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  // Fetch all sellers
  const { data: sellers } = await supabase
    .from("seller_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const sellerList = (sellers ?? []) as unknown as SellerRow[];

  // Fetch stats for each seller — published set count
  const sellerIds = sellerList.map((s) => s.id);

  const [
    { data: problemSetCounts },
    { data: purchaseCounts },
    { data: reviewStats },
  ] = await Promise.all([
    sellerIds.length > 0
      ? supabase
          .from("problem_sets")
          .select("seller_id, id")
          .in("seller_id", sellerIds)
          .eq("status", "published")
      : Promise.resolve({ data: [] }),
    sellerIds.length > 0
      ? supabase
          .from("purchases")
          .select("problem_set_id, amount_paid, problem_sets!inner(seller_id)")
          .in("problem_sets.seller_id", sellerIds)
      : Promise.resolve({ data: [] }),
    sellerIds.length > 0
      ? supabase
          .from("reviews")
          .select("rating, problem_set_id, problem_sets!inner(seller_id)")
          .in("problem_sets.seller_id", sellerIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Aggregate stats per seller
  const stats = new Map<
    string,
    { publishedSets: number; revenue: number; avgRating: number; reviewCount: number }
  >();

  for (const id of sellerIds) {
    stats.set(id, { publishedSets: 0, revenue: 0, avgRating: 0, reviewCount: 0 });
  }

  for (const ps of problemSetCounts ?? []) {
    const existing = stats.get(ps.seller_id);
    if (existing) existing.publishedSets++;
  }

  for (const p of (purchaseCounts ?? []) as Array<{
    amount_paid: number;
    problem_sets: { seller_id: string };
  }>) {
    const sellerId = p.problem_sets?.seller_id;
    if (sellerId) {
      const existing = stats.get(sellerId);
      if (existing) existing.revenue += p.amount_paid;
    }
  }

  for (const r of (reviewStats ?? []) as Array<{
    rating: number;
    problem_sets: { seller_id: string };
  }>) {
    const sellerId = r.problem_sets?.seller_id;
    if (sellerId) {
      const existing = stats.get(sellerId);
      if (existing) {
        existing.reviewCount++;
        existing.avgRating =
          (existing.avgRating * (existing.reviewCount - 1) + r.rating) /
          existing.reviewCount;
      }
    }
  }

  const totalSellers = sellerList.length;
  const verifiedCount = sellerList.filter((s) => !!s.verified_at).length;
  const stripeConnected = sellerList.filter((s) => !!s.stripe_account_id).length;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">出品者管理</h1>

      {/* Summary stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              出品者数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSellers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              認証済み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{verifiedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stripe接続済み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stripeConnected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Seller list */}
      {sellerList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            出品者がまだいません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sellerList.map((seller) => {
            const sellerStats = stats.get(seller.id);
            const isVerified = !!seller.verified_at;
            const isOnboarded =
              !!seller.tos_accepted_at && !!seller.stripe_account_id;

            return (
              <Card key={seller.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Seller info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {seller.seller_display_name ?? "名前未設定"}
                        </span>
                        {isVerified && (
                          <Badge variant="default" className="text-[10px]">
                            認証済み
                          </Badge>
                        )}
                        {isOnboarded ? (
                          <Badge variant="secondary" className="text-[10px]">
                            オンボード完了
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground"
                          >
                            未完了
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {seller.university && (
                          <span>{seller.university}</span>
                        )}
                        {seller.circle_name && (
                          <span>{seller.circle_name}</span>
                        )}
                        <span>
                          登録:{" "}
                          {new Date(seller.created_at).toLocaleDateString(
                            "ja-JP"
                          )}
                        </span>
                      </div>

                      {/* Stats row */}
                      {sellerStats && (
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                          <span>
                            公開セット:{" "}
                            <span className="font-medium">
                              {sellerStats.publishedSets}
                            </span>
                          </span>
                          <span>
                            売上:{" "}
                            <span className="font-medium">
                              ¥{sellerStats.revenue.toLocaleString()}
                            </span>
                          </span>
                          {sellerStats.reviewCount > 0 && (
                            <span>
                              評価:{" "}
                              <span className="font-medium">
                                {"★".repeat(Math.round(sellerStats.avgRating))}
                                {"☆".repeat(
                                  5 - Math.round(sellerStats.avgRating)
                                )}
                              </span>
                              <span className="ml-1 text-muted-foreground">
                                ({sellerStats.reviewCount}件)
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <SellerVerificationControls
                      sellerId={seller.id}
                      isVerified={isVerified}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
