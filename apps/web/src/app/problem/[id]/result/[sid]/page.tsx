import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PdfDownloadButton } from "@/components/solving/pdf-download-button";
import {
  History,
  Star,
  RotateCcw,
  FolderPlus,
} from "lucide-react";
import { gradingResultSchema } from "@toinoma/shared/schemas";
import { GradingResultDisplay } from "@/components/grading/grading-result";
import { AiAssistantDialog } from "@/components/ai-assistant/ai-assistant-dialog";
import { VideoPlayer } from "@/components/solving/video-player";
import { ScoreComparisonSection } from "./score-comparison-section";
import { getSubscriptionState } from "@/lib/subscription";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SiteFooter } from "@/components/navigation/site-footer";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: ps ? `採点結果 - ${ps.title} | 問の間` : "採点結果 | 問の間",
  };
}

export default async function GradingResultPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id, sid } = await params;
  const [supabase, navbarData] = await Promise.all([
    createClient(),
    getNavbarData(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: submission } = await supabase
    .from("submissions")
    .select("feedback, problem_set_id, score, max_score, created_at")
    .eq("id", sid)
    .eq("user_id", user.id)
    .single();

  if (!submission) notFound();
  if (submission.problem_set_id !== id) notFound();

  // Fetch problem set title, subscription state, review eligibility, and video junction rows in parallel
  const [{ data: ps }, subState, { count: submissionCount }, { data: existingReview }, { data: junctionRows }] =
    await Promise.all([
      supabase.from("problem_sets").select("title, subject").eq("id", id).single(),
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
      supabase
        .from("problem_set_questions")
        .select("question_id, position")
        .eq("problem_set_id", id)
        .order("section_number", { ascending: true })
        .order("position", { ascending: true }),
    ]);
  const isPro = subState.tier === "pro";

  // Show review prompt if user has 3+ submissions and hasn't reviewed yet
  const showReviewPrompt =
    !existingReview && (submissionCount ?? 0) >= 3;

  const videos: { url: string; title: string }[] = [];
  if (junctionRows && junctionRows.length > 0) {
    const questionIds = junctionRows.map((j) => j.question_id);
    const { data: questionsRaw } = await supabase
      .from("questions")
      .select("id, video_urls, question_text")
      .in("id", questionIds);

    if (questionsRaw) {
      for (const q of questionsRaw as Array<{
        id: string;
        video_urls: unknown;
        question_text: string;
      }>) {
        const urls = Array.isArray(q.video_urls) ? q.video_urls : [];
        for (const entry of urls) {
          if (typeof entry === "string" && entry) {
            videos.push({ url: entry, title: q.question_text.slice(0, 40) });
          } else if (entry && typeof entry === "object" && "url" in entry) {
            const obj = entry as { url: string; title?: string };
            videos.push({
              url: obj.url,
              title: obj.title ?? q.question_text.slice(0, 40),
            });
          }
        }
      }
    }
  }

  // Parse feedback as GradingResult
  const parseResult = gradingResultSchema.safeParse(submission.feedback);
  if (!parseResult.success) {
    return (
      <main id="main-content" className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-destructive">採点結果の読み込みに失敗しました</p>
      </main>
    );
  }

  const result = parseResult.data;

  // Format submission date
  const submittedDate = new Date(submission.created_at).toLocaleDateString(
    "ja-JP",
    { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
  );

  // Determine score category for celebration messaging
  const maxScore = submission.max_score ?? 0;
  const score = submission.score ?? 0;
  const scorePercent =
    maxScore > 0
      ? Math.round((score / maxScore) * 100)
      : 0;

  return (
    <>
      <AppNavbar {...navbarData} />
      <main id="main-content" className="container mx-auto max-w-3xl px-4 pb-12 pt-24">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: ps?.title ?? "問題詳細", href: `/problem/${id}` },
            { label: "採点結果" },
          ]}
          className="mb-6"
        />

        {/* Page header with actions */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">採点結果</h1>
            {ps && (
              <p className="mt-1 text-sm text-muted-foreground">
                {ps.title} - {submittedDate}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PdfDownloadButton problemSetId={id} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/problem/${id}/history`}>
                <History className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                履歴
              </Link>
            </Button>
          </div>
        </div>

        {/* Full grading result display (score hero + feedback + section breakdown) */}
        <GradingResultDisplay result={result} />

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

        {/* Action buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" asChild>
            <Link href={`/problem/${id}/solve`}>
              <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
              もう一度解く
            </Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/problem/${id}/history`}>
              <History className="mr-1.5 h-4 w-4" aria-hidden="true" />
              履歴を見る
            </Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/problem/${id}#collections`}>
              <FolderPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              コレクションに追加
            </Link>
          </Button>
        </div>

        {/* Review prompt (after 3+ submissions) */}
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
                  <Star className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  レビューを書く
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Score-based encouragement message */}
        <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4 text-center">
          {scorePercent >= 80 ? (
            <p className="text-sm font-medium text-success">
              素晴らしい結果です！この調子で頑張りましょう。
            </p>
          ) : scorePercent >= 50 ? (
            <p className="text-sm font-medium text-foreground">
              よく頑張りました。弱点を確認して、もう一度挑戦してみましょう。
            </p>
          ) : (
            <p className="text-sm font-medium text-foreground">
              まだ伸びしろがあります。解説を確認して、基礎を固めましょう。
            </p>
          )}
        </div>

        {/* Grading disclaimer */}
        <p role="note" className="mt-4 text-center text-xs text-muted-foreground">
          ※ AI採点は参考スコアです。最終的な判断はご自身でお願いいたします。
        </p>

        <AiAssistantDialog problemSetId={id} isPro={isPro} />
      </main>
      <SiteFooter />
    </>
  );
}
