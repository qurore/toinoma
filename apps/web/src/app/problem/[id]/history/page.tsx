import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SiteFooter } from "@/components/navigation/site-footer";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, TrendingUp, Trophy, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
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
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: ps ? `解答履歴 - ${ps.title} | 問の間` : "解答履歴 | 問の間",
  };
}

export default async function ProblemHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [navbarData, supabase] = await Promise.all([
    getNavbarData(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch problem set
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, title, subject")
    .eq("id", id)
    .single();
  if (!ps) notFound();

  // Check purchase
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_set_id", id)
    .single();
  if (!purchase) redirect(`/problem/${id}`);

  // Fetch all submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, score, max_score, created_at")
    .eq("user_id", user.id)
    .eq("problem_set_id", id)
    .order("created_at", { ascending: false });

  const allSubmissions = submissions ?? [];

  // Calculate statistics
  const scored = allSubmissions.filter(
    (s) => s.score != null && s.max_score != null && s.max_score! > 0
  );
  const bestScore =
    scored.length > 0
      ? Math.max(
          ...scored.map((s) => Math.round((s.score! / s.max_score!) * 100))
        )
      : null;
  const averageScore =
    scored.length > 0
      ? Math.round(
          scored.reduce(
            (sum, s) => sum + Math.round((s.score! / s.max_score!) * 100),
            0
          ) / scored.length
        )
      : null;

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-20 sm:px-6">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: ps.title, href: `/problem/${id}` },
            { label: "解答履歴" },
          ]}
          className="mb-6"
        />

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">解答履歴</h1>
            <p className="mt-1 text-sm text-muted-foreground">{ps.title}</p>
          </div>
          <Button className="shrink-0" asChild>
            <Link href={`/problem/${id}/solve`}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              もう一度解く
            </Link>
          </Button>
        </div>

        {/* Statistics cards */}
        {scored.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            {/* Best score */}
            <Card className="border-amber-500/20">
              <CardContent className="flex flex-col items-center py-4">
                <Trophy className="mb-1.5 h-5 w-5 text-amber-500" />
                <span className="text-xs text-muted-foreground">最高スコア</span>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    bestScore != null && bestScore >= 80
                      ? "text-success"
                      : bestScore != null && bestScore >= 50
                        ? "text-amber-600"
                        : "text-destructive"
                  )}
                >
                  {bestScore}%
                </span>
              </CardContent>
            </Card>

            {/* Average score */}
            <Card>
              <CardContent className="flex flex-col items-center py-4">
                <TrendingUp className="mb-1.5 h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">平均スコア</span>
                <span className="text-2xl font-bold tabular-nums">{averageScore}%</span>
              </CardContent>
            </Card>

            {/* Attempt count */}
            <Card>
              <CardContent className="flex flex-col items-center py-4">
                <BookOpen className="mb-1.5 h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">解答回数</span>
                <span className="text-2xl font-bold tabular-nums">
                  {allSubmissions.length}
                </span>
                <span className="text-xs text-muted-foreground">回</span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submission list */}
        {allSubmissions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">まだ解答履歴がありません</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                問題を解いてAI採点を受けてみましょう
              </p>
              <Button className="mt-5" asChild>
                <Link href={`/problem/${id}/solve`}>
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  解答を始める
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allSubmissions.map((s, i) => {
              const pct =
                s.max_score != null && s.max_score > 0
                  ? Math.round(((s.score ?? 0) / s.max_score) * 100)
                  : null;
              const attemptNumber = allSubmissions.length - i;
              const isBest = pct !== null && pct === bestScore;

              return (
                <Link
                  key={s.id}
                  href={`/problem/${id}/result/${s.id}`}
                  className={cn(
                    "group flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm",
                    isBest ? "border-amber-500/30 bg-amber-500/5" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Score indicator dot */}
                    <div
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        pct !== null && pct >= 80
                          ? "bg-success"
                          : pct !== null && pct >= 50
                            ? "bg-amber-500"
                            : pct !== null
                              ? "bg-destructive"
                              : "bg-muted-foreground/30"
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          第{attemptNumber}回目
                        </p>
                        {isBest && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/50 text-amber-600 text-xs"
                          >
                            <Trophy className="mr-0.5 h-3 w-3" />
                            最高
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {s.score ?? 0}/{s.max_score ?? 0}
                    </span>
                    {pct !== null && (
                      <span
                        className={cn(
                          "min-w-[3rem] rounded-md px-2 py-1 text-center text-sm font-semibold tabular-nums",
                          pct >= 80
                            ? "bg-success/10 text-success"
                            : pct >= 50
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {pct}%
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                  </div>
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
