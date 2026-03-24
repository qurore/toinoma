import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PdfDownloadButton } from "@/components/solving/pdf-download-button";
import {
  ArrowLeft,
  History,
  Star,
  RotateCcw,
  FolderPlus,
  AlertTriangle,
  TrendingUp,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { gradingResultSchema } from "@toinoma/shared/schemas";
import { GradingResultDisplay } from "@/components/grading/grading-result";
import { AiAssistantDialog } from "@/components/ai-assistant/ai-assistant-dialog";
import { VideoPlayer } from "@/components/solving/video-player";
import { ScoreComparisonSection } from "./score-comparison-section";
import { getSubscriptionState } from "@/lib/subscription";
import { cn } from "@/lib/utils";
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
  const supabase = await createClient();

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

  // Fetch problem set title, subscription state, and review eligibility in parallel
  const [{ data: ps }, subState, { count: submissionCount }, { data: existingReview }] =
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
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-destructive">採点結果の読み込みに失敗しました</p>
      </main>
    );
  }

  const result = parseResult.data;
  const percentage =
    result.maxScore > 0
      ? Math.round((result.totalScore / result.maxScore) * 100)
      : 0;

  // Determine score color tier
  const scoreTier =
    percentage >= 80 ? "high" : percentage >= 50 ? "mid" : "low";
  const tierColors = {
    high: {
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/30",
      ring: "ring-success/20",
    },
    mid: {
      bg: "bg-amber-500/10",
      text: "text-amber-600",
      border: "border-amber-500/30",
      ring: "ring-amber-500/20",
    },
    low: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      border: "border-destructive/30",
      ring: "ring-destructive/20",
    },
  };
  const colors = tierColors[scoreTier];

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      {/* Navigation header */}
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
        </div>
      </div>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">採点結果</h1>
        {ps && (
          <p className="mt-1 text-muted-foreground">{ps.title}</p>
        )}
      </div>

      {/* Score summary hero card */}
      <Card className={cn("mb-6 ring-2", colors.ring)}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            {/* Large score circle */}
            <div
              className={cn(
                "flex h-28 w-28 items-center justify-center rounded-full",
                colors.bg
              )}
            >
              <span className={cn("text-4xl font-bold", colors.text)}>
                {percentage}%
              </span>
            </div>

            {/* Score text */}
            <p className="mt-4 text-xl font-semibold">
              {result.totalScore} / {result.maxScore} 点
            </p>

            {/* Score bar */}
            <div className="mt-3 w-full max-w-xs">
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    percentage >= 80
                      ? "bg-success"
                      : percentage >= 50
                        ? "bg-amber-500"
                        : "bg-destructive"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Section score chips */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {result.sections.map((section) => {
                const secPct =
                  section.maxScore > 0
                    ? Math.round((section.score / section.maxScore) * 100)
                    : 0;
                return (
                  <Badge
                    key={section.number}
                    variant={
                      secPct >= 80
                        ? "default"
                        : secPct >= 50
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    大問{section.number}: {section.score}/{section.maxScore}
                  </Badge>
                );
              })}
            </div>

            {/* AI grading disclaimer */}
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              AI採点は参考スコアです。最終判断はご自身で行ってください。
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall feedback and improvement advice */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            総合フィードバック
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {result.overallFeedback}
          </p>

          {/* Improvement advice section */}
          <Separator />
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              改善のポイント
            </h3>
            <div className="space-y-2">
              {result.sections.map((section) => {
                // Find questions that lost significant points
                const weakQuestions = section.questions.filter(
                  (q) => q.maxScore > 0 && q.score / q.maxScore < 0.5
                );
                if (weakQuestions.length === 0) return null;
                return (
                  <div key={section.number} className="text-sm">
                    <p className="font-medium text-foreground">
                      大問{section.number}:
                    </p>
                    <ul className="ml-4 mt-1 space-y-0.5 text-muted-foreground">
                      {weakQuestions.map((q) => (
                        <li key={q.number} className="flex items-start gap-1.5">
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                          <span>
                            {q.number}: {q.feedback.slice(0, 100)}
                            {q.feedback.length > 100 ? "..." : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed section-by-section breakdown */}
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
            <RotateCcw className="mr-1.5 h-4 w-4" />
            もう一度解く
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/problem/${id}/history`}>
            <History className="mr-1.5 h-4 w-4" />
            履歴を見る
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/problem/${id}#collections`}>
            <FolderPlus className="mr-1.5 h-4 w-4" />
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
