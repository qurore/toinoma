import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ランキング - 問の間",
  description: "人気の問題セットランキング。科目別・総合ランキングをチェック。",
};

export default async function RankingsPage() {
  const navbarData = await getNavbarData();
  const supabase = await createClient();

  // Fetch published sets with purchase counts
  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, seller_id, created_at")
    .eq("status", "published");

  const sets = problemSets ?? [];
  const setIds = sets.map((s) => s.id);

  // Count purchases per set
  const { data: purchases } = setIds.length > 0
    ? await supabase
        .from("purchases")
        .select("problem_set_id")
        .in("problem_set_id", setIds)
    : { data: [] };

  const purchaseCounts: Record<string, number> = {};
  for (const p of purchases ?? []) {
    purchaseCounts[p.problem_set_id] =
      (purchaseCounts[p.problem_set_id] || 0) + 1;
  }

  // Fetch seller names
  const sellerIds = [...new Set(sets.map((s) => s.seller_id))];
  const { data: sellers } = sellerIds.length > 0
    ? await supabase
        .from("seller_profiles")
        .select("id, seller_display_name")
        .in("id", sellerIds)
    : { data: [] };

  const sellerMap = new Map(
    (sellers ?? []).map((s) => [s.id, s.seller_display_name])
  );

  // Sort by purchase count (descending)
  const ranked = sets
    .map((s) => ({
      ...s,
      purchaseCount: purchaseCounts[s.id] || 0,
      sellerName: sellerMap.get(s.seller_id) ?? "—",
    }))
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, 50);

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="container mx-auto px-4 py-8 pt-20">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">ランキング</h1>
        <p className="mb-8 text-muted-foreground">
          購入数で見る人気の問題セット
        </p>

        {ranked.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              まだランキングデータがありません
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {ranked.map((ps, index) => (
              <Link key={ps.id} href={`/problem/${ps.id}`}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground/60">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{ps.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {SUBJECT_LABELS[ps.subject as Subject]}
                        </Badge>
                        <span>{ps.sellerName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {ps.price === 0
                          ? "無料"
                          : `¥${ps.price.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ps.purchaseCount}件購入
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
