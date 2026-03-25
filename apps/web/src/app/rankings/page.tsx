import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { SiteFooter } from "@/components/navigation/site-footer";
import { MobileAppTabBar } from "@/components/navigation/mobile-app-tab-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Star, TrendingUp, Trophy } from "lucide-react";
import {
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
  SUBJECTS,
} from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ランキング - 問の間",
  description:
    "人気の問題セットランキング。科目別・総合ランキングをチェック。",
};

// ── Rank badge styling ──────────────────────────────────────────────────

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-100 text-amber-700 border-amber-300 font-bold",
  2: "bg-gray-100 text-gray-600 border-gray-300 font-bold",
  3: "bg-orange-100 text-orange-600 border-orange-300 font-bold",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-primary-50 text-primary-700 border-primary-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard: "bg-red-50 text-red-700 border-red-200",
};

// ── Enriched problem set type ───────────────────────────────────────────

interface RankedSet {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  price: number;
  seller_id: string;
  purchaseCount: number;
  sellerName: string;
  avgRating: number | null;
  reviewCount: number;
}

// ── Ranking card ────────────────────────────────────────────────────────

function RankingCard({ ps, rank }: { ps: RankedSet; rank: number }) {
  const rankStyle =
    RANK_STYLES[rank] ?? "bg-muted text-muted-foreground";

  return (
    <Link href={`/problem/${ps.id}`}>
      <Card className="transition-all hover:border-primary/20 hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
          {/* Rank number */}
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm tabular-nums sm:h-9 sm:w-9 ${rankStyle}`}
          >
            {rank}
          </span>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold sm:text-base">
              {ps.title}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge
                className="border border-border bg-secondary text-[10px] font-medium text-secondary-foreground sm:text-[11px]"
              >
                {SUBJECT_LABELS[ps.subject as Subject]}
              </Badge>
              <Badge
                className={`border text-[10px] font-medium sm:text-[11px] ${
                  DIFFICULTY_COLORS[ps.difficulty] ?? ""
                }`}
              >
                {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
              </Badge>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {ps.sellerName}
              </span>
              {ps.avgRating !== null && (
                <span className="flex items-center gap-0.5 text-xs">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-medium">
                    {ps.avgRating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground/60">
                    ({ps.reviewCount})
                  </span>
                </span>
              )}
            </div>
            {/* Seller name on mobile (below badges) */}
            <p className="mt-1 truncate text-xs text-muted-foreground sm:hidden">
              {ps.sellerName}
            </p>
          </div>

          {/* Price + purchases */}
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold">
              {ps.price === 0
                ? "無料"
                : `¥${ps.price.toLocaleString()}`}
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {ps.purchaseCount.toLocaleString()}件購入
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const subjectFilter = params.subject ?? "";
  const tab = params.tab ?? "purchases";

  const navbarData = await getNavbarData();
  const supabase = await createClient();

  // Fetch published sets
  let query = supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, seller_id, created_at")
    .eq("status", "published");

  if (
    subjectFilter &&
    (SUBJECTS as readonly string[]).includes(subjectFilter)
  ) {
    query = query.eq("subject", subjectFilter as Subject);
  }

  const { data: problemSets } = await query;
  const sets = problemSets ?? [];
  const setIds = sets.map((s) => s.id);

  // Count purchases + fetch reviews + fetch sellers in parallel
  const [purchasesResult, reviewsResult, sellersResult] =
    await Promise.all([
      setIds.length > 0
        ? supabase
            .from("purchases")
            .select("problem_set_id")
            .in("problem_set_id", setIds)
        : Promise.resolve({ data: [] }),
      setIds.length > 0
        ? supabase
            .from("reviews")
            .select("problem_set_id, rating")
            .in("problem_set_id", setIds)
        : Promise.resolve({ data: [] }),
      (() => {
        const sellerIds = [...new Set(sets.map((s) => s.seller_id))];
        return sellerIds.length > 0
          ? supabase
              .from("seller_profiles")
              .select("id, seller_display_name")
              .in("id", sellerIds)
          : Promise.resolve({ data: [] });
      })(),
    ]);

  const purchaseCounts: Record<string, number> = {};
  for (const p of purchasesResult.data ?? []) {
    const key = (p as { problem_set_id: string }).problem_set_id;
    purchaseCounts[key] = (purchaseCounts[key] || 0) + 1;
  }

  const reviewAgg: Record<string, { sum: number; count: number }> = {};
  for (const r of (reviewsResult.data ?? []) as {
    problem_set_id: string;
    rating: number;
  }[]) {
    if (!reviewAgg[r.problem_set_id])
      reviewAgg[r.problem_set_id] = { sum: 0, count: 0 };
    reviewAgg[r.problem_set_id].sum += r.rating;
    reviewAgg[r.problem_set_id].count++;
  }

  const sellerMap = new Map(
    (
      (sellersResult.data ?? []) as {
        id: string;
        seller_display_name: string;
      }[]
    ).map((s) => [s.id, s.seller_display_name])
  );

  // Enrich all sets
  const enriched: RankedSet[] = sets.map((s) => ({
    ...s,
    purchaseCount: purchaseCounts[s.id] || 0,
    sellerName: sellerMap.get(s.seller_id) ?? "—",
    avgRating: reviewAgg[s.id]
      ? reviewAgg[s.id].sum / reviewAgg[s.id].count
      : null,
    reviewCount: reviewAgg[s.id]?.count ?? 0,
  }));

  // Sort: by purchase count or by rating
  const byPurchases = [...enriched]
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, 50);

  // Top-rated: require at least 1 review, sort by weighted rating
  const byRating = [...enriched]
    .filter((s) => s.avgRating !== null && s.reviewCount > 0)
    .sort((a, b) => {
      // Wilson-like tiebreaker: prefer higher review count when ratings are equal
      const ratingDiff = (b.avgRating ?? 0) - (a.avgRating ?? 0);
      if (Math.abs(ratingDiff) < 0.01) return b.reviewCount - a.reviewCount;
      return ratingDiff;
    })
    .slice(0, 50);

  const ranked = tab === "rating" ? byRating : byPurchases;
  const isRatingTab = tab === "rating";

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-20 sm:px-6 md:pb-12">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "ランキング" },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Trophy className="h-6 w-6 text-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            ランキング
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            人気の問題セット Top 50
          </p>
        </div>

        {/* Ranking type tabs */}
        <div className="mb-4 flex items-center gap-2">
          <Link
            href={`/rankings${subjectFilter ? `?subject=${subjectFilter}` : ""}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !isRatingTab
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="h-4 w-4" />
            購入数ランキング
          </Link>
          <Link
            href={`/rankings?tab=rating${subjectFilter ? `&subject=${subjectFilter}` : ""}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isRatingTab
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="h-4 w-4" />
            高評価ランキング
          </Link>
        </div>

        {/* Subject filter tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Link
            href={`/rankings${isRatingTab ? "?tab=rating" : ""}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors sm:px-4 sm:py-1.5 sm:text-sm ${
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
              href={`/rankings?subject=${subject}${isRatingTab ? "&tab=rating" : ""}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors sm:px-4 sm:py-1.5 sm:text-sm ${
                subjectFilter === subject
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {SUBJECT_LABELS[subject as Subject]}
            </Link>
          ))}
        </div>

        {/* Results */}
        {ranked.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">
                {isRatingTab
                  ? "まだレビューのある問題セットがありません"
                  : "まだランキングデータがありません"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                問題セットが購入・レビューされるとランキングに表示されます
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {ranked.map((ps, index) => (
              <RankingCard key={ps.id} ps={ps} rank={index + 1} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
      <MobileAppTabBar />
    </>
  );
}
