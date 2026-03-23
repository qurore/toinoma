import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PdfDownloadButton } from "@/components/solving/pdf-download-button";
import { ArrowLeft, History } from "lucide-react";
import { gradingResultSchema } from "@toinoma/shared/schemas";
import { GradingResultDisplay } from "@/components/grading/grading-result";

export default async function GradingResultPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id, sid } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: submission } = await supabase
    .from("submissions")
    .select("feedback, problem_set_id")
    .eq("id", sid)
    .eq("user_id", user.id)
    .single();

  if (!submission) notFound();
  if (submission.problem_set_id !== id) notFound();

  // Fetch problem set title
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("title")
    .eq("id", id)
    .single();

  // Parse feedback as GradingResult
  const parseResult = gradingResultSchema.safeParse(submission.feedback);
  if (!parseResult.success) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-destructive">採点結果の読み込みに失敗しました</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/problem/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            問題詳細に戻る
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <PdfDownloadButton problemSetId={id} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/problem/${id}/history`}>
              <History className="mr-1 h-3.5 w-3.5" />
              履歴
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/problem/${id}/solve`}>もう一度解く</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">採点結果</h1>
        {ps && (
          <p className="mt-1 text-muted-foreground">{ps.title}</p>
        )}
      </div>

      <GradingResultDisplay result={parseResult.data} />
    </main>
  );
}
