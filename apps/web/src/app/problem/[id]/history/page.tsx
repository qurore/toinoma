import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "回答履歴 - 問の間",
};

export default async function ProblemHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const navbarData = await getNavbarData();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!ps) notFound();

  // Fetch all submissions for this user + problem set
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, score, max_score, graded_at, created_at")
    .eq("user_id", user.id)
    .eq("problem_set_id", id)
    .order("created_at", { ascending: false });

  const allSubmissions = submissions ?? [];

  // Calculate best score
  const scored = allSubmissions.filter(
    (s) => s.score != null && s.max_score != null && s.max_score > 0
  );
  const bestScore = scored.length > 0
    ? Math.max(...scored.map((s) => Math.round((s.score! / s.max_score!) * 100)))
    : null;

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="container mx-auto max-w-2xl px-4 py-8 pt-20">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/problem/${id}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              問題セットに戻る
            </Link>
          </Button>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          回答履歴: {ps.title}
        </h1>
        <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{allSubmissions.length} 回の回答</span>
          {bestScore !== null && <span>最高: {bestScore}%</span>}
        </div>

        {allSubmissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              まだ回答がありません
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allSubmissions.map((s, index) => {
              const pct =
                s.score != null && s.max_score && s.max_score > 0
                  ? Math.round((s.score / s.max_score) * 100)
                  : null;
              const attemptNumber = allSubmissions.length - index;

              return (
                <Link key={s.id} href={`/problem/${id}/result/${s.id}`}>
                  <Card className="transition-colors hover:border-primary/30">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium">
                          第{attemptNumber}回
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleString("ja-JP")}
                        </p>
                      </div>
                      <div className="text-right">
                        {pct !== null ? (
                          <>
                            <p className="text-lg font-bold">{pct}%</p>
                            <Badge
                              variant={
                                pct >= 80
                                  ? "default"
                                  : pct >= 60
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {s.score}/{s.max_score}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            採点中
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <Button asChild>
            <Link href={`/problem/${id}/solve`}>もう一度解く</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
