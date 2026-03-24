import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { problemSetRubricSchema } from "@toinoma/shared/schemas";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify purchase
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_set_id", id)
    .single();

  if (!purchase) redirect(`/problem/${id}`);

  // Fetch problem set with rubric
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("title, rubric, problem_pdf_url, time_limit_minutes")
    .eq("id", id)
    .single();

  if (!ps) notFound();

  // Check subscription tier for AI assistant access
  const subState = await getSubscriptionState(user.id);
  const isPro = subState.tier === "pro";

  const rubricResult = problemSetRubricSchema.safeParse(ps.rubric);
  if (!rubricResult.success) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-destructive">
          この問題セットのルーブリックが無効です。出題者に連絡してください。
        </p>
      </main>
    );
  }

  // Count total questions for the progress indicator
  const totalQuestions = rubricResult.data.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  );

  return (
    <>
      {/* Minimal exam-mode header bar */}
      <header className="fixed top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Left: Title */}
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {ps.title}
          </h1>

          {/* Center: Progress indicator */}
          <div className="mx-4 hidden shrink-0 items-center gap-3 sm:flex">
            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              全{totalQuestions}問
            </span>
            {ps.time_limit_minutes != null && ps.time_limit_minutes > 0 && (
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
                制限時間 {ps.time_limit_minutes}分
              </span>
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
        />

        <AiAssistantDialog problemSetId={id} isPro={isPro} />
      </main>
    </>
  );
}
