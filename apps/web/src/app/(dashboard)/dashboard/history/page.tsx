import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function SubmissionHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, problem_set_id, score, max_score, created_at, problem_sets(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = submissions ?? [];

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            ダッシュボード
          </Link>
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold tracking-tight">解答履歴</h1>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              まだ解答履歴がありません
            </p>
            <Button className="mt-4" asChild>
              <Link href="/explore">問題を探す</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((s) => {
            const ps = s.problem_sets as unknown as { title: string } | null;
            const percentage =
              s.max_score && s.max_score > 0
                ? Math.round(((s.score ?? 0) / s.max_score) * 100)
                : null;
            const date = new Date(s.created_at).toLocaleDateString("ja-JP");

            return (
              <Link key={s.id} href={`/problem/${s.problem_set_id}/result/${s.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {ps?.title ?? "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">{date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.score !== null && s.max_score !== null && (
                        <span className="text-sm font-semibold">
                          {s.score} / {s.max_score}
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
                        >
                          {percentage}%
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
    </main>
  );
}
