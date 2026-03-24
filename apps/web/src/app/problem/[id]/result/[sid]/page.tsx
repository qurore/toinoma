import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PdfDownloadButton } from "@/components/solving/pdf-download-button";
import { ArrowLeft, History, Star } from "lucide-react";
import { gradingResultSchema } from "@toinoma/shared/schemas";
import { GradingResultDisplay } from "@/components/grading/grading-result";
import { AiAssistantDialog } from "@/components/ai-assistant/ai-assistant-dialog";
import { VideoPlayer } from "@/components/solving/video-player";
import { ScoreComparisonSection } from "./score-comparison-section";
import { getSubscriptionState } from "@/lib/subscription";

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

  // Fetch problem set title, subscription state, and review eligibility in parallel
  const [{ data: ps }, subState, { count: submissionCount }, { data: existingReview }] =
    await Promise.all([
      supabase.from("problem_sets").select("title").eq("id", id).single(),
      getSubscriptionState(user.id),
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("problem_set_id", id),
      supabase
        .from("reviews")
        .select("id")
        .eq("user_id", user.id)
        .eq("problem_set_id", id)
        .maybeSingle(),
    ]);
  const isPro = subState.tier === "pro";

  // Show review prompt if user has 3+ submissions and hasn't reviewed yet
  const showReviewPrompt =
    !existingReview && (submissionCount ?? 0) >= 3;

  // Fetch video URLs from questions linked to this problem set
  const { data: junctionRows } = await supabase
    .from("problem_set_questions")
    .select("question_id, position")
    .eq("problem_set_id", id)
    .order("section_number", { ascending: true })
    .order("position", { ascending: true });

  const videos: { url: string; title: string }[] = [];
  if (junctionRows && junctionRows.length > 0) {
    const questionIds = junctionRows.map((j) => j.question_id);
    const { data: questionsRaw } = await supabase.from("questions")
      .select("id, video_urls, question_text")
      .in("id", questionIds);

    if (questionsRaw) {
      for (const q of questionsRaw as Array<{ id: string; video_urls: unknown; question_text: string }>) {
        const urls = Array.isArray(q.video_urls) ? q.video_urls : [];
        for (const entry of urls) {
          if (typeof entry === "string" && entry) {
            videos.push({ url: entry, title: q.question_text.slice(0, 40) });
          } else if (entry && typeof entry === "object" && "url" in entry) {
            const obj = entry as { url: string; title?: string };
            videos.push({ url: obj.url, title: obj.title ?? q.question_text.slice(0, 40) });
          }
        }
      }
    }
  }

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

      {/* Score comparison with other submissions */}
      <div className="mt-6">
        <ScoreComparisonSection problemSetId={id} userId={user.id} />
      </div>

      {/* Explanation videos (if any questions have video_urls) */}
      {videos.length > 0 && (
        <div className="mt-6">
          <VideoPlayer videos={videos} />
        </div>
      )}

      {/* REV-009: Review prompt after solving */}
      {showReviewPrompt && (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                この問題セットを評価しませんか？
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                レビューは他の学生の参考になります
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/problem/${id}#reviews`}>
                <Star className="mr-1.5 h-3.5 w-3.5" />
                レビューを書く
              </Link>
            </Button>
          </div>
        </div>
      )}

      <AiAssistantDialog problemSetId={id} isPro={isPro} />
    </main>
  );
}
