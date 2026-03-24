import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SiteFooter } from "@/components/navigation/site-footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RatingSummary } from "@/components/reviews/star-rating";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import {
  ProblemSetCard,
  type ProblemSetCardData,
} from "@/components/marketplace/problem-set-card";
// Subject/Difficulty labels used internally by ProblemSetCard
import { generateSellerMetadata } from "@/lib/metadata";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";
import {
  ShieldCheck,
  BookOpen,
  Users,
  Star,
  MessageSquare,
  Flag,
  Award,
  CalendarDays,
} from "lucide-react";

// ──────────────────────────────────────────────
// Seller tier badge logic
// ──────────────────────────────────────────────

type SellerTier = "bronze" | "silver" | "gold" | "platinum";

function getSellerTier(publishedCount: number): SellerTier {
  if (publishedCount >= 50) return "platinum";
  if (publishedCount >= 26) return "gold";
  if (publishedCount >= 10) return "silver";
  return "bronze";
}

const TIER_CONFIG: Record<
  SellerTier,
  { label: string; color: string }
> = {
  bronze: {
    label: "ブロンズ",
    color: "border border-border bg-secondary text-secondary-foreground",
  },
  silver: {
    label: "シルバー",
    color: "border border-border bg-secondary text-secondary-foreground",
  },
  gold: {
    label: "ゴールド",
    color: "border border-border bg-secondary text-secondary-foreground",
  },
  platinum: {
    label: "プラチナ",
    color: "border border-primary/30 bg-primary/10 text-primary",
  },
};

// ──────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("seller_display_name, seller_description, university")
    .eq("id", id)
    .single();

  if (!seller) {
    return { title: "出品者プロフィール - 問の間" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", id)
    .single();

  const { count } = await supabase
    .from("problem_sets")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", id)
    .eq("status", "published");

  return generateSellerMetadata({
    id,
    seller_display_name: seller.seller_display_name,
    seller_description: seller.seller_description,
    university: seller.university,
    avatar_url: profile?.avatar_url ?? null,
    problem_set_count: count ?? 0,
  });
}

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const navbarData = await getNavbarData();

  // Fetch seller profile
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select(
      "id, seller_display_name, seller_description, university, circle_name, tos_accepted_at, stripe_account_id, created_at"
    )
    .eq("id", id)
    .single();

  if (!seller?.tos_accepted_at) notFound();

  // Fetch user profile for avatar
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", id)
    .single();

  // Fetch published problem sets with cover images
  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select(
      "id, title, subject, difficulty, price, status, cover_image_url, created_at"
    )
    .eq("seller_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const sets = problemSets ?? [];
  const setIds = sets.map((s) => s.id);

  // Parallel data fetches
  const [purchasesResult, reviewsResult, currentUserResult] = await Promise.all(
    [
      // Total distinct purchasers
      setIds.length > 0
        ? supabase
            .from("purchases")
            .select("user_id", { count: "exact" })
            .in("problem_set_id", setIds)
        : Promise.resolve({ data: [], count: 0 }),
      // All reviews across seller's sets
      setIds.length > 0
        ? supabase.from("reviews")
            .select("id, problem_set_id, rating")
            .in("problem_set_id", setIds)
        : Promise.resolve({ data: [] }),
      // Current user check
      supabase.auth.getUser(),
    ]
  );

  const totalStudents = purchasesResult.count ?? 0;
  const reviews = (reviewsResult.data ?? []) as {
    id: string;
    problem_set_id: string;
    rating: number;
  }[];
  const currentUser = currentUserResult.data?.user ?? null;

  // Compute review aggregates
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

  const distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const r of reviews) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  }

  // Per-set review aggregates for ProblemSetCard
  const reviewBySet: Record<string, { total: number; sum: number }> = {};
  for (const r of reviews) {
    if (!reviewBySet[r.problem_set_id]) {
      reviewBySet[r.problem_set_id] = { total: 0, sum: 0 };
    }
    reviewBySet[r.problem_set_id].total++;
    reviewBySet[r.problem_set_id].sum += r.rating;
  }

  // Favorites for current user
  let favoritedIds = new Set<string>();
  if (currentUser && setIds.length > 0) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("problem_set_id")
      .eq("user_id", currentUser.id)
      .in("problem_set_id", setIds);
    favoritedIds = new Set(
      (favs ?? []).map(
        (f: { problem_set_id: string }) => f.problem_set_id
      )
    );
  }

  // Derived values
  const displayName =
    seller.seller_display_name !== "__pending__"
      ? seller.seller_display_name
      : profile?.display_name ?? "出品者";
  const initials = displayName.slice(0, 2).toUpperCase();
  const tier = getSellerTier(sets.length);
  const tierConfig = TIER_CONFIG[tier];
  const isVerified = !!seller.stripe_account_id;
  const memberSince = new Date(seller.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  // Build card data
  const cardData: ProblemSetCardData[] = sets.map((ps) => {
    const agg = reviewBySet[ps.id];
    return {
      id: ps.id,
      title: ps.title,
      subject: ps.subject as Subject,
      difficulty: ps.difficulty as Difficulty,
      price: ps.price,
      cover_image_url: ps.cover_image_url,
      seller_display_name: displayName,
      avg_rating: agg ? agg.sum / agg.total : null,
      review_count: agg ? agg.total : null,
    };
  });

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-20 sm:px-6">
        {/* ── Profile header ── */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Avatar */}
              <Avatar className="h-24 w-24 shrink-0">
                <AvatarImage
                  src={profile?.avatar_url ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {displayName}
                  </h1>

                  {/* Verification badge */}
                  {isVerified && (
                    <Badge
                      variant="secondary"
                      className="gap-1 text-xs font-medium text-primary"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      認証済み
                    </Badge>
                  )}

                  {/* Tier badge */}
                  <Badge
                    className={`gap-1 border text-xs font-medium ${tierConfig.color}`}
                  >
                    <Award className="h-3 w-3" />
                    {tierConfig.label}
                  </Badge>
                </div>

                {seller.university && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {seller.university}
                    {seller.circle_name && ` / ${seller.circle_name}`}
                  </p>
                )}

                {seller.seller_description && (
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80">
                    {seller.seller_description}
                  </p>
                )}

                {/* Report seller button */}
                <div className="mt-4">
                  <ReportDialog
                    targetType="problem_set"
                    targetId={id}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                        <Flag className="mr-1 h-3 w-3" />
                        出品者を報告
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex flex-col items-center rounded-lg bg-muted/50 p-4">
                <BookOpen className="mb-1.5 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{sets.length}</p>
                <p className="text-xs text-muted-foreground">問題セット</p>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-muted/50 p-4">
                <Users className="mb-1.5 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">
                  {totalStudents.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">購入者</p>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-muted/50 p-4">
                <Star className="mb-1.5 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">
                  {totalReviews > 0 ? averageRating.toFixed(1) : "-"}
                </p>
                <p className="text-xs text-muted-foreground">平均評価</p>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-muted/50 p-4">
                <MessageSquare className="mb-1.5 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{totalReviews}</p>
                <p className="text-xs text-muted-foreground">レビュー数</p>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-muted/50 p-4">
                <CalendarDays className="mb-1.5 h-5 w-5 text-primary" />
                <p className="text-sm font-bold">{memberSince}</p>
                <p className="text-xs text-muted-foreground">登録日</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Published problem sets ── */}
        <section className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="h-5 w-5 text-primary" />
            公開中の問題セット
          </h2>
          {sets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                公開中の問題セットはありません
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cardData.map((ps) => (
                <ProblemSetCard
                  key={ps.id}
                  data={ps}
                  isFavorited={favoritedIds.has(ps.id)}
                  userId={currentUser?.id ?? null}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Reviews summary ── */}
        {totalReviews > 0 && (
          <section className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-5 w-5 text-primary" />
                  レビューサマリー
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RatingSummary
                  averageRating={averageRating}
                  totalReviews={totalReviews}
                  distribution={distribution}
                />
              </CardContent>
            </Card>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
