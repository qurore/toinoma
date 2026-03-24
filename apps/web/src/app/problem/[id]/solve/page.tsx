import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, AlertTriangle, Lock } from "lucide-react";
import { problemSetRubricSchema } from "@toinoma/shared/schemas";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import { SolveClient } from "@/components/grading/solve-client";
import { AiAssistantDialog } from "@/components/ai-assistant/ai-assistant-dialog";
import { getSubscriptionState } from "@/lib/subscription";
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
    title: ps ? `${ps.title} - 解答 | 問の間` : "解答 | 問の間",
  };
}

export default async function ProblemSolvePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Authentication check ──
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Parallel data fetching ──
  const [
    { data: purchase },
    { data: ps },
    subState,
  ] = await Promise.all([
    // Verify purchase
    supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("problem_set_id", id)
      .single(),
    // Fetch problem set
    supabase
      .from("problem_sets")
      .select("title, subject, rubric, problem_pdf_url, time_limit_minutes, total_points")
      .eq("id", id)
      .single(),
    // Check subscription tier
    getSubscriptionState(user.id),
  ]);

  // ── Purchase verification ──
  if (!purchase) redirect(`/problem/${id}`);

  // ── Problem set existence check ──
  if (!ps) notFound();

  // ── Rubric validation ──
  const rubricResult = problemSetRubricSchema.safeParse(ps.rubric);
  if (!rubricResult.success) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            この問題セットのルーブリックが無効です
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            出題者にお問い合わせください
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href={`/problem/${id}`}>問題詳細に戻る</Link>
          </Button>
        </div>
      </main>
    );
  }

  // ── Grading limit check ──
  const isPro = subState.tier === "pro";
  const tierConfig = SUBSCRIPTION_TIERS[subState.tier];

  if (!subState.canGrade) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-12">
        <div className="rounded-lg border border-border p-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            今月のAI採点回数の上限に達しました
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tierConfig.label}プランでは月{tierConfig.gradingLimit}回までAI採点をご利用いただけます。
            プランをアップグレードするか、来月までお待ちください。
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            今月の使用回数: {subState.gradingsUsedThisMonth} / {tierConfig.gradingLimit}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/settings/subscription">プランを変更</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/problem/${id}`}>問題詳細に戻る</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ── Compute question stats ──
  const totalQuestions = rubricResult.data.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  );

  // ── Render ──
  return (
    <>
      {/* Minimal exam-mode header bar */}
      <header className="fixed top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Left: Title */}
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {ps.title}
          </h1>

          {/* Center: Metadata badges */}
          <div className="mx-4 hidden shrink-0 items-center gap-2 sm:flex">
            <Badge variant="outline" className="text-xs tabular-nums">
              全{totalQuestions}問
            </Badge>
            {ps.total_points > 0 && (
              <Badge variant="outline" className="text-xs tabular-nums">
                {ps.total_points}点満点
              </Badge>
            )}
            {ps.time_limit_minutes != null && ps.time_limit_minutes > 0 && (
              <Badge variant="outline" className="text-xs tabular-nums">
                制限時間 {ps.time_limit_minutes}分
              </Badge>
            )}
            {/* Grading usage indicator */}
            {subState.gradingLimit !== -1 && (
              <Badge variant="secondary" className="text-xs tabular-nums">
                残り{subState.gradingsRemaining === Infinity ? "無制限" : subState.gradingsRemaining}回
              </Badge>
            )}
          </div>

          {/* Right: Exit button */}
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href={`/problem/${id}`}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              終了する
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-20 sm:px-6">
        <p className="mb-6 text-sm text-muted-foreground">
          解答を入力してAI採点を受けましょう
        </p>

        <SolveClient
          problemSetId={id}
          rubric={rubricResult.data}
          userId={user.id}
          problemPdfUrl={ps.problem_pdf_url}
          timeLimitMinutes={ps.time_limit_minutes}
          subject={ps.subject}
        />

        <AiAssistantDialog problemSetId={id} isPro={isPro} />
      </main>
    </>
  );
}
