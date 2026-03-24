import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { SiteFooter } from "@/components/navigation/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Star } from "lucide-react";
import { SUBJECT_LABELS, SUBJECTS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ランキング - 問の間",
  description: "人気の問題セットランキング。科目別・総合ランキングをチェック。",
};

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-100 text-amber-700 border-amber-300 font-bold",
  2: "bg-gray-100 text-gray-600 border-gray-300 font-bold",
  3: "bg-orange-100 text-orange-600 border-orange-300 font-bold",
};

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const subjectFilter = params.subject ?? "";

  const navbarData = await getNavbarData();
  const supabase = await createClient();

  // Fetch published sets
  let query = supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, seller_id, created_at")
    .eq("status", "published");

  if (subjectFilter && (SUBJECTS as readonly string[]).includes(subjectFilter)) {
    query = query.eq("subject", subjectFilter as Subject);
  }

  const { data: problemSets } = await query;
  const sets = problemSets ?? [];
  const setIds = sets.map((s) => s.id);

  // Count purchases + fetch reviews in parallel
  const [purchasesResult, reviewsResult, sellersResult] = await Promise.all([
    setIds.length > 0
      ? supabase.from("purchases").select("problem_set_id").in("problem_set_id", setIds)
      : Promise.resolve({ data: [] }),
    setIds.length > 0
      ? supabase.from("reviews").select("problem_set_id, rating").in("problem_set_id", setIds)
      : Promise.resolve({ data: [] }),
    (() => {
      const sellerIds = [...new Set(sets.map((s) => s.seller_id))];
      return sellerIds.length > 0
        ? supabase.from("seller_profiles").select("id, seller_display_name").in("id", sellerIds)
        : Promise.resolve({ data: [] });
    })(),
  ]);

  const purchaseCounts: Record<string, number> = {};
  for (const p of purchasesResult.data ?? []) {
    const key = (p as { problem_set_id: string }).problem_set_id;
    purchaseCounts[key] = (purchaseCounts[key] || 0) + 1;
  }

  const reviewAgg: Record<string, { sum: number; count: number }> = {};
  for (const r of (reviewsResult.data ?? []) as { problem_set_id: string; rating: number }[]) {
    if (!reviewAgg[r.problem_set_id]) reviewAgg[r.problem_set_id] = { sum: 0, count: 0 };
    reviewAgg[r.problem_set_id].sum += r.rating;
    reviewAgg[r.problem_set_id].count++;
  }

  const sellerMap = new Map(
    ((sellersResult.data ?? []) as { id: string; seller_display_name: string }[]).map((s) => [s.id, s.seller_display_name])
  );

  // Sort by purchase count
  const ranked = sets
    .map((s) => ({
      ...s,
      purchaseCount: purchaseCounts[s.id] || 0,
      sellerName: sellerMap.get(s.seller_id) ?? "—",
      avgRating: reviewAgg[s.id] ? reviewAgg[s.id].sum / reviewAgg[s.id].count : null,
      reviewCount: reviewAgg[s.id]?.count ?? 0,
    }))
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, 50);

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="mx-auto max-w-4xl px-4 pb-12 pt-20 sm:px-6">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "ランキング" },
          ]}
          className="mb-6"
        />
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Trophy className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            ランキング
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            購入数で見る人気の問題セット Top 50
          </p>
        </div>

        {/* Subject filter tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href="/rankings"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !subjectFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            すべて
          </Link>
          {SUBJECTS.map((subject) => (
            <Link
              key={subject}
              href={`/rankings?subject=${subject}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                subjectFilter === subject
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {SUBJECT_LABELS[subject as Subject]}
            </Link>
          ))}
        </div>

        {ranked.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                まだランキングデータがありません
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {ranked.map((ps, index) => {
              const rank = index + 1;
              const rankStyle = RANK_STYLES[rank] ?? "bg-muted text-muted-foreground";
              return (
                <Link key={ps.id} href={`/problem/${ps.id}`}>
                  <Card className="transition-all hover:border-primary/20 hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 p-4">
                      {/* Rank number */}
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm ${rankStyle}`}
                      >
                        {rank}
                      </span>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{ps.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {SUBJECT_LABELS[ps.subject as Subject]}
                          </Badge>
                          <span>{ps.sellerName}</span>
                          {ps.avgRating !== null && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {ps.avgRating.toFixed(1)}
                              <span className="text-muted-foreground/60">
                                ({ps.reviewCount})
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price + purchases */}
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {ps.price === 0
                            ? "無料"
                            : `¥${ps.price.toLocaleString()}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ps.purchaseCount.toLocaleString()}件購入
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
