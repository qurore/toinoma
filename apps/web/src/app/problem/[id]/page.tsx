import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText,
  GraduationCap,
  Flag,
  Star,
  Users,
  Clock,
  BookOpen,
  ChevronRight,
  History,
  Send,
  TrendingUp,
} from "lucide-react";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import { PurchaseSection } from "@/components/marketplace/purchase-section";
import { AddToCollectionDialog } from "@/components/collections/add-to-collection-dialog";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SiteFooter } from "@/components/navigation/site-footer";
import { ShareButton } from "@/components/navigation/share-button";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { QaSection } from "@/components/qa/qa-section";
import { PdfDownloadButton } from "@/components/solving/pdf-download-button";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import { ProblemSetCard } from "@/components/marketplace/problem-set-card";
import { ProblemDetailTabs } from "@/components/marketplace/problem-detail-tabs";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { trackView } from "@/lib/recently-viewed";
import {
  generateProblemSetMetadata,
  buildProductJsonLd,
} from "@/lib/metadata";
import { cn } from "@/lib/utils";
import type { Subject, Difficulty, AnswerType } from "@/types/database";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ps } = await supabase
    .from("problem_sets")
    .select(
      "id, title, description, subject, university, difficulty, price, cover_image_url, seller_id"
    )
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!ps) {
    return { title: "問題セット - 問の間" };
  }

  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("seller_display_name")
    .eq("id", ps.seller_id)
    .single();

  return generateProblemSetMetadata({
    id: ps.id,
    title: ps.title,
    description: ps.description,
    subject: ps.subject as Subject,
    difficulty: ps.difficulty as Difficulty,
    university: ps.university,
    price: ps.price,
    cover_image_url: ps.cover_image_url,
    seller_display_name: seller?.seller_display_name ?? null,
  });
}

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [navbarData, supabase] = await Promise.all([
    getNavbarData(),
    createClient(),
  ]);

  // Fetch problem set with seller info
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, title, description, subject, university, difficulty, price, problem_pdf_url, seller_id, status, preview_question_ids, total_points, time_limit_minutes, created_at")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!ps) notFound();

  // Fetch seller separately to avoid type inference issue with joins
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("seller_display_name, university, circle_name, seller_description")
    .eq("id", ps.seller_id)
    .single();

  // Fetch seller's avatar from profiles
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("avatar_url, display_name")
    .eq("id", ps.seller_id)
    .single();

  // Fetch review aggregate for this problem set
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("problem_set_id", id);

  const totalReviewCount = reviews?.length ?? 0;
  const avgRating =
    totalReviewCount > 0
      ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviewCount
      : null;

  // Fetch purchase count and submission count in parallel
  const [{ count: purchaseCount }, { count: submissionCount }, { count: questionCount }] =
    await Promise.all([
      supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("problem_set_id", id),
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("problem_set_id", id),
      supabase
        .from("problem_set_questions")
        .select("id", { count: "exact", head: true })
        .eq("problem_set_id", id),
    ]);

  // Count other problem sets by this seller (for seller card)
  const { count: sellerProblemCount } = await supabase
    .from("problem_sets")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", ps.seller_id)
    .eq("status", "published");

  // Check if user has purchased
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasPurchased = false;
  let userBestScore: number | null = null;
  let userAttemptCount = 0;
  if (user) {
    const [{ data: purchase }, { data: submissions }] = await Promise.all([
      supabase
        .from("purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("problem_set_id", id)
        .single(),
      supabase
        .from("submissions")
        .select("score, max_score")
        .eq("user_id", user.id)
        .eq("problem_set_id", id)
        .order("created_at", { ascending: false }),
    ]);
    hasPurchased = !!purchase;
    userAttemptCount = submissions?.length ?? 0;
    if (submissions && submissions.length > 0) {
      const scored = submissions.filter(
        (s) => s.score != null && s.max_score != null && s.max_score! > 0
      );
      if (scored.length > 0) {
        userBestScore = Math.max(
          ...scored.map((s) => Math.round((s.score! / s.max_score!) * 100))
        );
      }
    }
  }

  // MKT-018: Track recently viewed (fire-and-forget for authenticated users)
  if (user) {
    trackView(user.id, id).catch(() => {
      // Silently ignore tracking errors — non-critical
    });
  }

  // MKT-011: Fetch preview questions if available
  const previewQuestionIds = (ps.preview_question_ids ?? []) as string[];
  let previewQuestions: Array<{
    id: string;
    question_type: AnswerType;
    question_text: string;
    points: number;
  }> = [];
  if (previewQuestionIds.length > 0) {
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_type, question_text, points")
      .in("id", previewQuestionIds.slice(0, 2));
    previewQuestions = (questions ?? []) as typeof previewQuestions;
  }

  // MKT-013: Fetch related problem sets (same subject, excluding current)
  const { data: relatedSets } = await supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, cover_image_url, university, seller_id")
    .eq("subject", ps.subject)
    .eq("status", "published")
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(4);

  // Fetch seller display names for related sets
  let relatedWithSellers: Array<{
    id: string;
    title: string;
    subject: Subject;
    difficulty: Difficulty;
    price: number;
    cover_image_url: string | null;
    university: string | null;
    seller_display_name: string | null;
  }> = [];
  if (relatedSets && relatedSets.length > 0) {
    const sellerIds = [...new Set(relatedSets.map((s) => s.seller_id))];
    const { data: sellers } = await supabase
      .from("seller_profiles")
      .select("id, seller_display_name")
      .in("id", sellerIds);
    const sellerMap = new Map(
      (sellers ?? []).map((s) => [s.id, s.seller_display_name])
    );
    relatedWithSellers = relatedSets.map((s) => ({
      id: s.id,
      title: s.title,
      subject: s.subject as Subject,
      difficulty: s.difficulty as Difficulty,
      price: s.price,
      cover_image_url: s.cover_image_url,
      university: s.university,
      seller_display_name: sellerMap.get(s.seller_id) ?? null,
    }));
  }

  // Format creation date
  const createdDate = new Date(ps.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <AppNavbar {...navbarData} />
      <main id="main-content" className="container mx-auto max-w-7xl px-4 pb-12 pt-16">
        {/* Breadcrumb navigation */}
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "問題を探す", href: "/explore" },
            { label: SUBJECT_LABELS[ps.subject as Subject], href: `/explore?subject=${ps.subject}` },
            { label: ps.title },
          ]}
          className="mb-6"
        />

        {/* 2-column layout: main content + sidebar */}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* ── Main content column ─────────────────────────── */}
          <div className="min-w-0 space-y-6">
            {/* Hero header */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {ps.title}
                </h1>
                <ShareButton title={ps.title} className="shrink-0" />
              </div>

              {/* Badge row: subject + difficulty + university */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge className="border border-border bg-secondary text-secondary-foreground">
                  {SUBJECT_LABELS[ps.subject as Subject]}
                </Badge>
                <Badge
                  className={cn(
                    "border font-medium",
                    ps.difficulty === "easy"
                      ? "border-primary-200 bg-primary-50 text-primary-700"
                      : ps.difficulty === "medium"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-red-200 bg-red-50 text-red-700"
                  )}
                >
                  {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
                </Badge>
                {ps.university && (
                  <Badge variant="secondary">{ps.university}</Badge>
                )}
              </div>

              {/* Social proof strip — always visible before scroll */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
                {/* Rating */}
                {avgRating != null && totalReviewCount > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i <= Math.round(avgRating)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-muted text-muted"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">
                      {avgRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({totalReviewCount}件)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Star className="h-4 w-4" aria-hidden="true" />
                    <span>レビューなし</span>
                  </div>
                )}

                <Separator orientation="vertical" className="hidden h-5 sm:block" />

                {/* Purchase count */}
                <div className="flex items-center gap-1.5 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-semibold">{purchaseCount ?? 0}</span>
                  <span className="text-muted-foreground">人が購入</span>
                </div>

                <Separator orientation="vertical" className="hidden h-5 sm:block" />

                {/* Submission count */}
                <div className="flex items-center gap-1.5 text-sm">
                  <Send className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-semibold">{submissionCount ?? 0}</span>
                  <span className="text-muted-foreground">回解答</span>
                </div>
              </div>

              {/* Quick stats strip */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {(questionCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    全{questionCount}問
                  </span>
                )}
                {ps.total_points > 0 && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    {ps.total_points}点満点
                  </span>
                )}
                {ps.time_limit_minutes != null && ps.time_limit_minutes > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {ps.time_limit_minutes}分
                  </span>
                )}
                <span className="text-xs">
                  {createdDate}公開
                </span>
              </div>
            </div>

            {/* User progress card (for purchased users with submissions) */}
            {hasPurchased && userAttemptCount > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    {userBestScore !== null && (
                      <div className="text-center">
                        <span
                          className={cn(
                            "text-2xl font-bold",
                            userBestScore >= 80
                              ? "text-success"
                              : userBestScore >= 50
                                ? "text-amber-600"
                                : "text-destructive"
                          )}
                        >
                          {userBestScore}%
                        </span>
                        <p className="text-xs text-muted-foreground">最高スコア</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {userAttemptCount}回解答済み
                      </p>
                      <p className="text-xs text-muted-foreground">
                        あなたの学習状況
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/problem/${id}/history`}>
                        <History className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        履歴
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/problem/${id}/solve`}>
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        解答する
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabbed content area */}
            <ProblemDetailTabs
              description={ps.description}
              previewQuestions={previewQuestions}
              problemPdfUrl={ps.problem_pdf_url}
              hasPurchased={hasPurchased}
              problemSetId={id}
              sellerId={ps.seller_id}
              userId={user?.id ?? null}
              reviewsSection={
                <ReviewsSection
                  problemSetId={id}
                  userId={user?.id ?? null}
                />
              }
              qaSection={
                <QaSection
                  problemSetId={id}
                  sellerId={ps.seller_id}
                  userId={user?.id ?? null}
                />
              }
            />
          </div>

          {/* ── Sidebar column ──────────────────────────────── */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Purchase / Solve section (primary CTA) */}
            <PurchaseSection
              problemSetId={id}
              price={ps.price}
              hasPurchased={hasPurchased}
              isLoggedIn={!!user}
              sellerId={ps.seller_id}
            />

            {/* Collection + PDF actions for purchased users */}
            {hasPurchased && user && (
              <div className="flex items-center gap-2">
                <PdfDownloadButton problemSetId={id} />
                <AddToCollectionDialog problemSetId={id} />
              </div>
            )}

            {/* Seller info card */}
            {seller && (
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/3 px-5 pb-4 pt-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    出題者
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      {sellerProfile?.avatar_url && (
                        <AvatarImage
                          src={sellerProfile.avatar_url}
                          alt={seller.seller_display_name ?? ""}
                        />
                      )}
                      <AvatarFallback className="bg-muted">
                        <GraduationCap className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link
                        href={`/seller/${ps.seller_id}`}
                        className="font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {seller.seller_display_name}
                      </Link>
                      {(seller.university || seller.circle_name) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {[seller.university, seller.circle_name]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <CardContent className="px-5 pb-5 pt-0">
                  {seller.seller_description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {seller.seller_description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    {(sellerProblemCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" aria-hidden="true" />
                        {sellerProblemCount}セット公開中
                      </span>
                    )}
                  </div>
                  <Separator className="my-3" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <Link href={`/seller/${ps.seller_id}`}>
                      <GraduationCap className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      プロフィールを見る
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Report content */}
            <div className="flex justify-center">
              <ReportDialog
                targetType="problem_set"
                targetId={id}
                trigger={
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    <Flag className="mr-1 h-3 w-3" aria-hidden="true" />
                    この問題セットを報告
                  </Button>
                }
              />
            </div>
          </aside>
        </div>

        {/* MKT-013: Related problem sets (full-width section) */}
        {relatedWithSellers.length > 0 && (
          <section className="mt-12" aria-labelledby="related-heading">
            <Separator className="mb-8" />
            <div className="mb-6 flex items-center justify-between">
              <h2
                id="related-heading"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <TrendingUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                関連する問題セット
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/explore?subject=${ps.subject}`}>
                  もっと見る
                  <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedWithSellers.map((related) => (
                <ProblemSetCard
                  key={related.id}
                  data={related}
                  userId={user?.id ?? null}
                />
              ))}
            </div>
          </section>
        )}

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: buildProductJsonLd({
              id: ps.id,
              title: ps.title,
              description: ps.description,
              subject: ps.subject as Subject,
              difficulty: ps.difficulty as Difficulty,
              university: ps.university,
              price: ps.price,
              cover_image_url: null,
              seller_display_name: seller?.seller_display_name ?? null,
            }),
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
