import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ProblemSetCard,
  type ProblemSetCardData,
} from "@/components/marketplace/problem-set-card";
import type { Subject, Difficulty } from "@/types/database";

// ──────────────────────────────────────────────
// Shared section wrapper — text-only headers
// ──────────────────────────────────────────────

function SectionWrapper({
  title,
  subtitle,
  href,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between sm:mb-8">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          </div>
          <Link
            href={href}
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            もっと見る
          </Link>
        </div>

        {/* Cards grid */}
        {children}

        {/* Mobile "see all" link */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href={href}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            もっと見る
          </Link>
        </div>
      </div>
    </section>
  );
}

function CardsGrid({ cards }: { cards: ProblemSetCardData[] }) {
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
        <p className="text-sm text-muted-foreground">
          まだ問題セットが公開されていません
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <ProblemSetCard key={card.id} data={card} />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Data fetching helpers
// ──────────────────────────────────────────────

interface RawProblemSet {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  price: number;
  cover_image_url: string | null;
  university: string | null;
  seller_id: string;
  created_at: string;
}

async function enrichWithReviewsAndSellers(
  sets: RawProblemSet[]
): Promise<ProblemSetCardData[]> {
  if (sets.length === 0) return [];

  const supabase = await createClient();
  const setIds = sets.map((s) => s.id);
  const sellerIds = [...new Set(sets.map((s) => s.seller_id))];

  const [reviewsResult, sellersResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("problem_set_id, rating")
      .in("problem_set_id", setIds),
    supabase
      .from("seller_profiles")
      .select("id, seller_display_name")
      .in("id", sellerIds),
  ]);

  // Aggregate reviews
  const agg: Record<string, { sum: number; count: number }> = {};
  for (const r of reviewsResult.data ?? []) {
    const key = r.problem_set_id;
    if (!agg[key]) agg[key] = { sum: 0, count: 0 };
    agg[key].sum += r.rating;
    agg[key].count++;
  }

  const sellerMap: Record<string, string> = {};
  for (const s of sellersResult.data ?? []) {
    sellerMap[s.id] = s.seller_display_name;
  }

  return sets.map((ps) => ({
    id: ps.id,
    title: ps.title,
    subject: ps.subject as Subject,
    difficulty: ps.difficulty as Difficulty,
    price: ps.price,
    cover_image_url: ps.cover_image_url,
    university: ps.university,
    seller_display_name: sellerMap[ps.seller_id] ?? null,
    avg_rating: agg[ps.id] ? agg[ps.id].sum / agg[ps.id].count : null,
    review_count: agg[ps.id]?.count ?? null,
  }));
}

// ──────────────────────────────────────────────
// Trending section (top 8 by recent purchase count)
// ──────────────────────────────────────────────

export async function TrendingSection() {
  const supabase = await createClient();

  // Get recent purchases (last 30 days) grouped by problem_set_id
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentPurchases } = await supabase
    .from("purchases")
    .select("problem_set_id")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .limit(100);

  let cards: ProblemSetCardData[] = [];

  if (recentPurchases && recentPurchases.length > 0) {
    // Count purchases per set
    const counts: Record<string, number> = {};
    for (const p of recentPurchases) {
      counts[p.problem_set_id] = (counts[p.problem_set_id] ?? 0) + 1;
    }

    // Sort by count, take top 8
    const topIds = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([id]) => id);

    if (topIds.length > 0) {
      const { data: sets } = await supabase
        .from("problem_sets")
        .select(
          "id, title, subject, difficulty, price, cover_image_url, university, seller_id, created_at"
        )
        .eq("status", "published")
        .in("id", topIds);

      if (sets && sets.length > 0) {
        // Maintain trending order
        const setMap = new Map(sets.map((s) => [s.id, s]));
        const ordered = topIds
          .map((id) => setMap.get(id))
          .filter(Boolean) as RawProblemSet[];

        cards = await enrichWithReviewsAndSellers(ordered);
      }
    }
  }

  return (
    <SectionWrapper
      title="人気の問題セット"
      subtitle="直近30日間で最も購入されている問題セット"
      href="/explore?sort=popular"
      className="py-16 md:py-20"
    >
      <CardsGrid cards={cards} />
    </SectionWrapper>
  );
}

// ──────────────────────────────────────────────
// New arrivals section (latest 8 published)
// ──────────────────────────────────────────────

export async function NewArrivalsSection() {
  const supabase = await createClient();

  const { data: sets } = await supabase
    .from("problem_sets")
    .select(
      "id, title, subject, difficulty, price, cover_image_url, university, seller_id, created_at"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(8);

  const cards =
    sets && sets.length > 0
      ? await enrichWithReviewsAndSellers(sets as RawProblemSet[])
      : [];

  return (
    <SectionWrapper
      title="新着問題セット"
      subtitle="最近公開された問題セット"
      href="/explore?sort=newest"
      className="bg-secondary/30 py-16 md:py-20"
    >
      <CardsGrid cards={cards} />
    </SectionWrapper>
  );
}

// ──────────────────────────────────────────────
// Top rated section (top 8 by avg rating, min 3 reviews)
// ──────────────────────────────────────────────

export async function TopRatedSection() {
  const supabase = await createClient();

  // Get reviews and aggregate (bounded to prevent unbounded data fetching)
  const { data: allReviews } = await supabase
    .from("reviews")
    .select("problem_set_id, rating")
    .limit(1000);

  let cards: ProblemSetCardData[] = [];

  if (allReviews && allReviews.length > 0) {
    const agg: Record<string, { sum: number; count: number }> = {};
    for (const r of allReviews) {
      const key = r.problem_set_id;
      if (!agg[key]) agg[key] = { sum: 0, count: 0 };
      agg[key].sum += r.rating;
      agg[key].count++;
    }

    // Filter for min 3 reviews, sort by avg rating
    const topIds = Object.entries(agg)
      .filter(([, v]) => v.count >= 3)
      .map(([id, v]) => ({
        id,
        avg: v.sum / v.count,
        count: v.count,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8)
      .map((e) => e.id);

    if (topIds.length > 0) {
      const { data: sets } = await supabase
        .from("problem_sets")
        .select(
          "id, title, subject, difficulty, price, cover_image_url, university, seller_id, created_at"
        )
        .eq("status", "published")
        .in("id", topIds);

      if (sets && sets.length > 0) {
        // Pre-computed review data — pass through enrichment for seller names
        cards = await enrichWithReviewsAndSellers(sets as RawProblemSet[]);

        // Re-sort by avg rating (enrichment may change order)
        cards.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
      }
    }
  }

  return (
    <SectionWrapper
      title="高評価の問題セット"
      subtitle="3件以上のレビューで高い評価を得ている問題セット"
      href="/explore?sort=highest_rated"
      className="py-16 md:py-20"
    >
      <CardsGrid cards={cards} />
    </SectionWrapper>
  );
}
