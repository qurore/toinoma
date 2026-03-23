import Link from "next/link";
import { Check, Circle, BookOpen, Upload, BarChart3 } from "lucide-react";
import { getSellerTosStatus } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SellerTosGate } from "@/components/seller/seller-tos-gate";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";

export default async function SellerDashboardPage() {
  const { user, sellerProfile, tosAccepted } = await getSellerTosStatus();

  // Show ToS modal if not accepted
  if (!tosAccepted) {
    return <SellerTosGate />;
  }

  const supabase = await createClient();

  // Check onboarding completion for banner
  const profileComplete =
    !!sellerProfile?.seller_display_name &&
    sellerProfile.seller_display_name !== "__pending__";
  const stripeComplete = !!sellerProfile?.stripe_account_id;
  const onboardingComplete = profileComplete && stripeComplete;

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
      {/* Onboarding completion banner */}
      {!onboardingComplete && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">
                セットアップを完了して、出品を始めましょう
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {!profileComplete
                  ? "プロフィールを設定すると、あなたの問題セットが購入者に表示されます"
                  : "支払い設定を完了すると、有料問題セットの販売収益を受け取れます"}
              </p>
              {/* Step progress */}
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-success">
                  <Check className="h-3.5 w-3.5" />
                  利用規約
                </span>
                <span className="flex items-center gap-1.5">
                  {profileComplete ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                  <span className={profileComplete ? "text-success" : "text-muted-foreground"}>
                    プロフィール
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  {stripeComplete ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                  <span className={stripeComplete ? "text-success" : "text-muted-foreground"}>
                    支払い設定
                  </span>
                </span>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link href="/sell/onboarding">
                {!profileComplete ? "プロフィールを設定" : "支払い設定を完了"}
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            出品者ダッシュボード
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
            <p className="text-3xl font-bold text-success">
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
          <CardContent className="py-12">
            <div className="mx-auto max-w-sm text-center">
              <p className="mb-2 text-lg font-medium">
                最初の問題セットを作成しましょう
              </p>
              <p className="mb-6 text-sm text-muted-foreground">
                問題を作成してルーブリックを設定すれば、すぐに公開できます
              </p>
              <div className="mb-6 grid grid-cols-3 gap-3 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <BookOpen className="h-5 w-5 text-foreground/60" />
                  </div>
                  <span className="text-xs text-muted-foreground">問題作成</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Upload className="h-5 w-5 text-foreground/60" />
                  </div>
                  <span className="text-xs text-muted-foreground">PDF入稿</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <BarChart3 className="h-5 w-5 text-foreground/60" />
                  </div>
                  <span className="text-xs text-muted-foreground">販売分析</span>
                </div>
              </div>
              <Button asChild>
                <Link href="/sell/new">新規作成</Link>
              </Button>
            </div>
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
