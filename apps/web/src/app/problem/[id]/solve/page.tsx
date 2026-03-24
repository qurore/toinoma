import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { problemSetRubricSchema } from "@toinoma/shared/schemas";
import { SolveClient } from "@/components/grading/solve-client";
import { AiAssistantDialog } from "@/components/ai-assistant/ai-assistant-dialog";
import { getSubscriptionState } from "@/lib/subscription";

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

  return (
    <>
      {/* Minimal exam-mode header bar */}
      <header className="fixed top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {ps.title}
          </h1>
          {ps.time_limit_minutes != null && ps.time_limit_minutes > 0 && (
            <span className="mx-4 shrink-0 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
              {ps.time_limit_minutes}分
            </span>
          )}
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href={`/problem/${id}`}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              終了する
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 pb-8 pt-20">
        <p className="mb-6 text-sm text-muted-foreground">
          解答を入力してAI採点を受けましょう
        </p>

        {ps.problem_pdf_url && (
          <div className="mb-6">
            <iframe
              src={ps.problem_pdf_url}
              className="h-[500px] w-full rounded-lg border border-border"
              title="問題PDF"
            />
          </div>
        )}

        <SolveClient
          problemSetId={id}
          rubric={rubricResult.data}
          userId={user.id}
        />

        <AiAssistantDialog problemSetId={id} isPro={isPro} />
      </main>
    </>
  );
}
