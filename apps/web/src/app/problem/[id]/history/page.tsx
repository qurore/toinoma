import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "解答履歴 | 問の間",
};

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
        {/* Back link */}
        <Link
          href={`/problem/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          問題詳細に戻る
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">解答履歴</h1>
            <p className="mt-1 text-sm text-muted-foreground">{ps.title}</p>
          </div>
          <Button asChild>
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
            <Card>
              <CardContent className="flex flex-col items-center py-4">
                <Trophy className="mb-1 h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">最高スコア</span>
                <span className="text-2xl font-bold text-primary">
                  {bestScore}%
                </span>
              </CardContent>
            </Card>

            {/* Average score */}
            <Card>
              <CardContent className="flex flex-col items-center py-4">
                <TrendingUp className="mb-1 h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">平均スコア</span>
                <span className="text-2xl font-bold">{averageScore}%</span>
              </CardContent>
            </Card>

            {/* Attempt count */}
            <Card>
              <CardContent className="flex flex-col items-center py-4">
                <span className="mb-1 text-xs text-muted-foreground">
                  解答回数
                </span>
                <span className="text-2xl font-bold">
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
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">まだ解答履歴がありません</p>
              <Button className="mt-4" asChild>
                <Link href={`/problem/${id}/solve`}>解答を始める</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
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
                    "flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary/20",
                    isBest ? "border-amber-500/30" : "border-border"
                  )}
                >
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
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {s.score ?? 0}/{s.max_score ?? 0}
                    </span>
                    {pct !== null && (
                      <Badge
                        variant={
                          pct >= 80
                            ? "default"
                            : pct >= 50
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {pct}%
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
