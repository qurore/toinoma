import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Tag, Ticket } from "lucide-react";
import { CouponListActions } from "@/components/seller/coupon-list-actions";
import type { Database } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "クーポン管理 - 問の間",
};

type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];

/**
 * Derive the display status of a coupon from its data.
 * Returns a status key and a human-readable label.
 */
function deriveCouponStatus(coupon: CouponRow): {
  key: "active" | "inactive" | "expired" | "exhausted";
  label: string;
} {
  const now = new Date();

  if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
    return { key: "exhausted", label: "上限到達" };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) <= now) {
    return { key: "expired", label: "期限切れ" };
  }
  if (!coupon.active) {
    return { key: "inactive", label: "無効" };
  }
  return { key: "active", label: "有効" };
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "outline",
  expired: "secondary",
  exhausted: "destructive",
};

export default async function CouponsPage() {
  const { user } = await requireSellerTos();
  const supabase = await createClient();

  // Fetch all coupons for this seller with optional problem_set title
  const { data: coupons } = await supabase
    .from("coupons")
    .select("*, problem_sets(title)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const allCoupons = (coupons ?? []) as Array<
    CouponRow & { problem_sets: { title: string } | null }
  >;

  // Fetch seller's problem sets for the create form
  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select("id, title")
    .eq("seller_id", user.id)
    .eq("status", "published")
    .order("title");

  const sellerSets = problemSets ?? [];

  // Summary stats
  const activeCount = allCoupons.filter(
    (c) => deriveCouponStatus(c).key === "active"
  ).length;
  const totalUses = allCoupons.reduce((sum, c) => sum + c.current_uses, 0);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">クーポン管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            割引クーポンを作成して販売を促進しましょう
          </p>
        </div>
        {/* The create button opens a dialog via client component */}
        <CouponListActions
          coupons={allCoupons}
          sellerSets={sellerSets}
          trigger={
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              クーポンを作成
            </Button>
          }
        />
      </div>

      {/* Stats row */}
      {allCoupons.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">合計</p>
            <p className="text-lg font-bold">{allCoupons.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">有効</p>
            <p className="text-lg font-bold text-success">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">総利用回数</p>
            <p className="text-lg font-bold">{totalUses}</p>
          </div>
        </div>
      )}

      {allCoupons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Ticket className="h-6 w-6 text-foreground/60" />
            </div>
            <p className="mb-2 text-lg font-medium">
              クーポンがまだありません
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              割引クーポンを作成して、購入者にお得な価格で問題セットを提供しましょう
            </p>
            <CouponListActions
              coupons={[]}
              sellerSets={sellerSets}
              trigger={
                <Button>
                  <Plus className="mr-1.5 h-4 w-4" />
                  最初のクーポンを作成
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allCoupons.map((coupon) => {
            const status = deriveCouponStatus(coupon);
            const isPercentage = coupon.coupon_type === "percentage";
            const discountDisplay = isPercentage
              ? `${coupon.discount_value}%`
              : `¥${coupon.discount_value.toLocaleString()}`;
            const usageDisplay = coupon.max_uses
              ? `${coupon.current_uses} / ${coupon.max_uses}`
              : `${coupon.current_uses}`;
            const scopeDisplay = coupon.applies_to_all
              ? "全問題セット"
              : coupon.problem_sets?.title ?? "特定セット";

            return (
              <Card key={coupon.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Tag className="h-4 w-4 text-foreground/60" />
                  </div>

                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold tracking-wider">
                        {coupon.code}
                      </span>
                      <Badge variant={STATUS_VARIANT[status.key]}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {isPercentage ? "割引率" : "割引額"}: {discountDisplay}
                      </span>
                      <span>利用数: {usageDisplay}</span>
                      <span>対象: {scopeDisplay}</span>
                      {coupon.min_purchase > 0 && (
                        <span>
                          最低購入額: ¥{coupon.min_purchase.toLocaleString()}
                        </span>
                      )}
                      {coupon.expires_at && (
                        <span>
                          期限:{" "}
                          {new Date(coupon.expires_at).toLocaleDateString(
                            "ja-JP"
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <CouponListActions
                    coupons={allCoupons}
                    sellerSets={sellerSets}
                    activeCouponId={coupon.id}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
