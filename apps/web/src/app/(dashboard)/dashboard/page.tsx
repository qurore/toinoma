import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, History, Heart, FolderOpen } from "lucide-react";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Recent purchases
  const { data: recentPurchases } = await supabase
    .from("purchases")
    .select("id, problem_set_id, created_at, problem_sets(title, subject, difficulty)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent submissions
  const { data: recentSubmissions } = await supabase
    .from("submissions")
    .select("id, problem_set_id, score, max_score, created_at, problem_sets(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Counts
  const { count: purchaseCount } = await supabase
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: submissionCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: favoriteCount } = await supabase
    .from("favorites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: collectionCount } = await supabase
    .from("collections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">ダッシュボード</h1>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              購入済み
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{purchaseCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              解答回数
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{submissionCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              お気に入り
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{favoriteCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              コレクション
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{collectionCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">最近の購入</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/explore">もっと探す</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!recentPurchases?.length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                まだ購入履歴がありません
              </p>
            ) : (
              <div className="space-y-3">
                {recentPurchases.map((p) => {
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
                      <span className="truncate text-sm font-medium">
                        {ps?.title ?? "Unknown"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {ps?.subject && (
                          <Badge variant="outline" className="text-xs">
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
              <Link href="/dashboard/history">すべて表示</Link>
            </Button>
          </CardHeader>

          <CardContent>
            {!recentSubmissions?.length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                まだ解答履歴がありません
              </p>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((s) => {
                  const ps = s.problem_sets as unknown as {
                    title: string;
                  } | null;
                  const percentage =
                    s.max_score && s.max_score > 0
                      ? Math.round(((s.score ?? 0) / s.max_score) * 100)
                      : null;
                  return (
                    <Link
                      key={s.id}
                      href={`/problem/${s.problem_set_id}/result/${s.id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="truncate text-sm font-medium">
                        {ps?.title ?? "Unknown"}
                      </span>
                      {percentage !== null && (
                        <Badge
                          variant={
                            percentage >= 80
                              ? "default"
                              : percentage >= 50
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {percentage}%
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
