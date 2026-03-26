import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lock, ChevronRight } from "lucide-react";
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
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" aria-hidden="true" />
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
      <main id="main-content" className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="rounded-lg border border-border p-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
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
      {/* Exam-mode header bar */}
      <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Left: Breadcrumb + Title */}
          <div className="min-w-0 flex-1">
            <nav aria-label="パンくずリスト" className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <Link href={`/problem/${id}`} className="hover:text-foreground">
                {ps.title}
              </Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-foreground">解答</span>
            </nav>
            <h1 className="truncate text-sm font-semibold text-foreground sm:hidden">
              {ps.title}
            </h1>
          </div>

          {/* Center: Metadata badges */}
          <div className="mx-4 hidden shrink-0 items-center gap-2 md:flex">
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
              終了する
            </Link>
          </Button>
        </div>

        {/* Mobile metadata strip */}
        <div className="flex items-center gap-2 border-t border-border/50 bg-muted/30 px-4 py-1.5 sm:px-6 md:hidden">
          <span className="text-xs tabular-nums text-muted-foreground">
            全{totalQuestions}問
          </span>
          {ps.total_points > 0 && (
            <>
              <span className="text-xs text-muted-foreground/50">|</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {ps.total_points}点満点
              </span>
            </>
          )}
          {ps.time_limit_minutes != null && ps.time_limit_minutes > 0 && (
            <>
              <span className="text-xs text-muted-foreground/50">|</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {ps.time_limit_minutes}分
              </span>
            </>
          )}
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6 md:pt-20">
        {/* Instruction banner with keyboard shortcut hints */}
        <div className="mb-6 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            各問題に解答を入力し、画面下部の「解答を提出してAI採点」ボタンで提出してください。
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl+S</kbd>{" "}
            下書き保存 ・{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl+Enter</kbd>{" "}
            提出 ・ 30秒ごとに自動保存
          </p>
        </div>

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
