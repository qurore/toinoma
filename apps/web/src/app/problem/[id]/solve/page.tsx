import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { problemSetRubricSchema } from "@toinoma/shared/schemas";
import { SolveClient } from "@/components/grading/solve-client";

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
    .select("title, rubric, problem_pdf_url")
    .eq("id", id)
    .single();

  if (!ps) notFound();

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
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/problem/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            問題詳細に戻る
          </Link>
        </Button>
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight">{ps.title}</h1>
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
      />
    </main>
  );
}
