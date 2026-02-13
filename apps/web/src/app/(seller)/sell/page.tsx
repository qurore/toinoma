import Link from "next/link";
import { requireCompleteSeller } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";

export default async function SellerDashboardPage() {
  const { user } = await requireCompleteSeller();
  const supabase = await createClient();

  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, status, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const sets = problemSets ?? [];
  const publishedCount = sets.filter((s) => s.status === "published").length;
  const draftCount = sets.filter((s) => s.status === "draft").length;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            販売者ダッシュボード
          </h1>
          <p className="mt-1 text-muted-foreground">
            問題セットの管理・作成
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/sell/analytics">販売分析</Link>
          </Button>
          <Button asChild>
            <Link href="/sell/new">新規作成</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              公開中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-500">
              {publishedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              下書き
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-muted-foreground">
              {draftCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Problem Set List */}
      {sets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="mb-4 text-lg text-muted-foreground">
              まだ問題セットがありません
            </p>
            <Button asChild>
              <Link href="/sell/new">最初の問題セットを作成</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sets.map((ps) => (
            <Card key={ps.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/sell/${ps.id}/edit`}
                      className="truncate font-medium hover:underline"
                    >
                      {ps.title}
                    </Link>
                    <StatusBadge status={ps.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {SUBJECT_LABELS[ps.subject as Subject]}
                    </span>
                    <span>
                      {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
                    </span>
                    <span>
                      {ps.price === 0 ? "無料" : `¥${ps.price.toLocaleString()}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/sell/${ps.id}/rubric`}>ルーブリック</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/sell/${ps.id}/edit`}>編集</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return <Badge variant="default">公開中</Badge>;
  }
  return <Badge variant="secondary">下書き</Badge>;
}
