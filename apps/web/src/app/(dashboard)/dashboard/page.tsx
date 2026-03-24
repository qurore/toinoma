import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  History,
  Target,
  Flame,
  Search,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import {
  ProblemSetCard,
  type ProblemSetCardData,
} from "@/components/marketplace/problem-set-card";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ダッシュボード - 問の間",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all dashboard data in a single parallel batch
  const [
    { data: profile },
    { data: recentPurchases },
    { data: recentSubmissions },
    { count: purchaseCount },
    { count: submissionCount },
    { data: allScored },
    { data: streakSubmissions },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, preferred_subjects")
      .eq("id", user.id)
      .single(),
    supabase
      .from("purchases")
      .select(
        "id, problem_set_id, created_at, problem_sets(title, subject, difficulty)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("submissions")
      .select(
        "id, problem_set_id, score, max_score, created_at, problem_sets(title, subject)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("submissions")
      .select("score, max_score")
      .eq("user_id", user.id)
      .not("score", "is", null)
      .not("max_score", "is", null),
    supabase
      .from("submissions")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Calculate average score across all scored submissions
  const scoredEntries = (allScored ?? []).filter(
    (s) => s.max_score != null && s.max_score > 0
  );
  const averageScore =
    scoredEntries.length > 0
      ? Math.round(
          scoredEntries.reduce(
            (sum, s) => sum + ((s.score ?? 0) / s.max_score!) * 100,
            0
          ) / scoredEntries.length
        )
      : null;

  // Calculate current study streak (timezone-aware using JST)
  const toLocalDate = (date: Date): string =>
    date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  const submissionDates = new Set(
    (streakSubmissions ?? []).map((s) => toLocalDate(new Date(s.created_at)))
  );

  let currentStreak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDate(d);
    if (submissionDates.has(dateStr)) {
      currentStreak++;
    } else if (i > 0) {
      break;
    }
  }

  // Find "continue studying" — most recent purchase with fewer submissions
  // Identify purchased sets the user hasn't submitted answers for yet
  // Note: this query depends on recentPurchases, so it runs after the parallel batch
  const purchasedSetIds = (recentPurchases ?? []).map(
    (p) => p.problem_set_id
  );
  const { data: submissionCounts } =
    purchasedSetIds.length > 0
      ? await supabase
          .from("submissions")
          .select("problem_set_id")
          .eq("user_id", user.id)
          .in("problem_set_id", purchasedSetIds)
      : { data: [] };

  const submittedSetIds = new Set(
    (submissionCounts ?? []).map((s) => s.problem_set_id)
  );
  const continueItems = (recentPurchases ?? [])
    .filter((p) => !submittedSetIds.has(p.problem_set_id))
    .slice(0, 3);

  const isNewUser =
    (purchaseCount ?? 0) === 0 && (submissionCount ?? 0) === 0;

  // Derive display name and preferred subjects from profile
  const displayName = profile?.display_name ?? null;
  const preferredSubjects = (profile?.preferred_subjects ?? []) as Subject[];

  // Fetch recommended problem sets based on preferred subjects
  const allPurchasedSetIds = (recentPurchases ?? []).map(
    (p) => p.problem_set_id
  );
  const { data: recommendedSets } =
    preferredSubjects.length > 0
      ? await supabase
          .from("problem_sets")
          .select(
            "id, title, subject, university, difficulty, price, cover_image_url"
          )
          .eq("status", "published")
          .in("subject", preferredSubjects)
          .order("created_at", { ascending: false })
          .limit(allPurchasedSetIds.length > 0 ? 20 : 6)
      : { data: [] };

  // Filter out already-purchased sets and take at most 6
  const recommendations = (recommendedSets ?? [])
    .filter((ps) => !allPurchasedSetIds.includes(ps.id))
    .slice(0, 6) as ProblemSetCardData[];

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "マイページ", href: "/dashboard" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {displayName
            ? `こんにちは、${displayName}さん`
            : "ダッシュボード"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          学習の進捗を確認しましょう
        </p>
      </div>

      {/* New user empty state */}
      {isNewUser ? (
        <Card className="mb-8 border-dashed">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              問の間へようこそ!
            </h2>
            <p className="mb-6 max-w-md text-sm text-muted-foreground">
              AI採点付きの入試問題で学習を始めましょう。まずは問題セットを探してみてください。
            </p>
            <Button asChild size="lg">
              <Link href="/explore">
                <Search className="mr-2 h-4 w-4" />
                問題を探す
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 4 stat cards — display only, not links */}
          <div className="stagger-children mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  購入済みセット
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{purchaseCount ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">購入した問題セット</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  総解答回数
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{submissionCount ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">これまでの解答数</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  平均正答率
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">
                  {averageScore !== null ? `${averageScore}%` : "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {averageScore !== null ? "全科目の平均" : "解答データなし"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  連続学習日数
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Flame className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold tabular-nums">{currentStreak}</p>
                  <span className="text-sm text-muted-foreground">日</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {currentStreak > 0 ? "継続中!" : "今日から始めましょう"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Continue studying section */}
          {continueItems.length > 0 && (
            <div className="mb-8 space-y-3">
              <h2 className="text-base font-semibold">
                学習を続ける
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {continueItems.map((item) => {
                  const ps = item.problem_sets as unknown as {
                    title: string;
                    subject: string;
                    difficulty: string;
                  } | null;
                  if (!ps) return null;
                  return (
                    <Card
                      key={item.id}
                      className="border-primary/20 bg-primary/[0.02] transition-colors hover:border-primary/30"
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {ps.title}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Badge variant="secondary" className="border border-border text-xs">
                              {SUBJECT_LABELS[ps.subject as Subject]}
                            </Badge>
                            <Progress
                              value={0}
                              className="h-1.5 max-w-[80px]"
                            />
                            <span className="text-xs text-muted-foreground">
                              未解答
                            </span>
                          </div>
                        </div>
                        <Button asChild size="sm" className="shrink-0">
                          <Link
                            href={`/problem/${item.problem_set_id}/solve`}
                          >
                            <ArrowRight className="mr-1.5 h-4 w-4" />
                            解答する
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recommended for you section — based on preferred subjects from onboarding */}
      {recommendations.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              おすすめの問題セット
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={`/explore?subject=${preferredSubjects.join(",")}`}
              >
                もっと見る
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((ps) => (
              <ProblemSetCard
                key={ps.id}
                data={ps}
                userId={user.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent activity cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">最近の購入</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/explore">
                もっと探す
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!recentPurchases?.length ? (
              <div className="flex flex-col items-center py-8 text-center">
                <BookOpen className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  まだ購入履歴がありません
                </p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link href="/explore">問題を探す</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentPurchases.slice(0, 5).map((p) => {
                  const ps = p.problem_sets as unknown as {
                    title: string;
                    subject: string;
                    difficulty: string;
                  } | null;
                  return (
                    <Link
                      key={p.id}
                      href={`/problem/${p.problem_set_id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0 truncate text-sm font-medium">
                        {ps?.title ?? "（不明な問題セット）"}
                      </span>
                      <div className="ml-2 flex shrink-0 items-center gap-1.5">
                        {ps?.subject && (
                          <Badge variant="secondary" className="border border-border text-xs">
                            {SUBJECT_LABELS[ps.subject as Subject]}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">最近の解答</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/history">
                すべて表示
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!recentSubmissions?.length ? (
              <div className="flex flex-col items-center py-8 text-center">
                <History className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  まだ解答履歴がありません
                </p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link href="/explore">問題を探して解答する</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSubmissions.map((s) => {
                  const ps = s.problem_sets as unknown as {
                    title: string;
                    subject: string;
                  } | null;
                  const percentage =
                    s.max_score && s.max_score > 0
                      ? Math.round(((s.score ?? 0) / s.max_score) * 100)
                      : null;
                  const date = new Date(s.created_at).toLocaleDateString(
                    "ja-JP",
                    { month: "short", day: "numeric" }
                  );
                  return (
                    <Link
                      key={s.id}
                      href={`/problem/${s.problem_set_id}/result/${s.id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {ps?.title ?? "（不明な問題セット）"}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {date}
                        </span>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-2">
                        {s.score !== null && s.max_score !== null && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {s.score}/{s.max_score}
                          </span>
                        )}
                        {percentage !== null && (
                          <Badge
                            variant={
                              percentage >= 80
                                ? "default"
                                : percentage >= 50
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="min-w-[3rem] justify-center tabular-nums"
                          >
                            {percentage}%
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
