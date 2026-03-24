import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, BookOpen, Printer, FolderPlus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "購入完了 | 問の間",
};

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ problem_set_id?: string }>;
}) {
  const [navbarData, supabase] = await Promise.all([
    getNavbarData(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const problemSetId = params.problem_set_id;

  let problemSet: {
    title: string;
    subject: string;
    difficulty: string;
    total_points: number | null;
    time_limit_minutes: number | null;
  } | null = null;

  if (problemSetId) {
    const { data: ps } = await supabase
      .from("problem_sets")
      .select("title, subject, difficulty, total_points, time_limit_minutes")
      .eq("id", problemSetId)
      .single();
    if (ps) problemSet = ps;
  }

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="flex min-h-screen items-center justify-center px-4 pt-14 pb-20">
        <div className="w-full max-w-lg">
          {/* Success card */}
          <Card className="overflow-hidden">
            {/* Green accent top bar */}
            <div className="h-1.5 bg-gradient-to-r from-primary to-green-light" />

            <CardContent className="px-8 pt-10 pb-8 text-center">
              {/* Success icon with animation */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>

              <h1 className="mb-2 text-2xl font-bold tracking-tight">
                購入完了
              </h1>

              {problemSet ? (
                <div className="mb-6">
                  <p className="text-base font-medium text-foreground">
                    {problemSet.title}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {SUBJECT_LABELS[problemSet.subject as Subject]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {DIFFICULTY_LABELS[problemSet.difficulty as Difficulty]}
                    </Badge>
                    {problemSet.total_points && (
                      <Badge variant="outline" className="text-xs">
                        {problemSet.total_points}点満点
                      </Badge>
                    )}
                    {problemSet.time_limit_minutes && (
                      <Badge variant="outline" className="text-xs">
                        {problemSet.time_limit_minutes}分
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    ご購入ありがとうございます。今すぐ学習を始めましょう！
                  </p>
                </div>
              ) : (
                <p className="mb-6 text-sm text-muted-foreground">
                  ご購入ありがとうございます！
                </p>
              )}

              {/* Primary CTA */}
              {problemSetId && (
                <Button size="lg" className="mb-4 w-full" asChild>
                  <Link href={`/problem/${problemSetId}/solve`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    今すぐ解答する
                  </Link>
                </Button>
              )}

              {/* Secondary actions */}
              {problemSetId && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/problem/${problemSetId}/print?mode=problems`}>
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      印刷する
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/collections">
                      <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
                      コレクションへ
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next steps */}
          <div className="mt-6 space-y-2">
            <p className="text-center text-xs font-medium text-muted-foreground">
              次のステップ
            </p>
            <div className="space-y-1.5">
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                <span>マイページで学習状況を確認</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link
                href="/explore"
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                <span>他の問題セットを探す</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
