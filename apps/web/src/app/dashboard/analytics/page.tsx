import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";
import type { Metadata } from "next";
import { StudyStreak, type StudyStreakData } from "@/components/dashboard/study-streak";
import { SubjectRadar, type SubjectScore } from "@/components/dashboard/subject-radar";
import {
  StrengthsWeaknesses,
  type SubjectAnalysis,
} from "@/components/dashboard/strengths-weaknesses";
import {
  ScoreComparison,
  type ScoreComparisonData,
  type ScoreComparisonAttempt,
} from "@/components/solving/score-comparison";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export const metadata: Metadata = {
  title: "学習分析 - 問の間",
};

export default async function DashboardAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all submissions with problem set info
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, score, max_score, created_at, problem_set_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const allSubmissions = submissions ?? [];

  // Fetch problem set subjects
  const setIds = [...new Set(allSubmissions.map((s) => s.problem_set_id))];
  const { data: sets } =
    setIds.length > 0
      ? await supabase
          .from("problem_sets")
          .select("id, subject")
          .in("id", setIds)
      : { data: [] };

  const setSubjectMap = new Map(
    (sets ?? []).map((s) => [s.id, s.subject as Subject])
  );

  // ── Per-subject scoring with trend analysis ────────────────────────────────

  const subjectData: Record<
    string,
    { total: number; count: number; recent: number[]; older: number[] }
  > = {};

  const scoredSubmissions = allSubmissions.filter(
    (s) => s.score != null && s.max_score != null && s.max_score! > 0
  );

  // Split point for trend: submissions in the most recent 30% vs older 70%
  const trendSplitIndex = Math.floor(scoredSubmissions.length * 0.7);

  for (let i = 0; i < scoredSubmissions.length; i++) {
    const sub = scoredSubmissions[i];
    const subject = setSubjectMap.get(sub.problem_set_id);
    if (!subject) continue;

    const pct = (sub.score! / sub.max_score!) * 100;

    if (!subjectData[subject]) {
      subjectData[subject] = { total: 0, count: 0, recent: [], older: [] };
    }
    subjectData[subject].total += pct;
    subjectData[subject].count += 1;

    if (i >= trendSplitIndex) {
      subjectData[subject].recent.push(pct);
    } else {
      subjectData[subject].older.push(pct);
    }
  }

  const subjectAverages = Object.entries(subjectData)
    .map(([subject, data]) => ({
      subject: subject as Subject,
      average: Math.round(data.total / data.count),
      count: data.count,
    }))
    .sort((a, b) => b.average - a.average);

  // Build SubjectScore[] for radar chart
  const radarSubjects: SubjectScore[] = subjectAverages.map((s) => ({
    subject: s.subject,
    averagePercent: s.average,
    count: s.count,
  }));

  // Build SubjectAnalysis[] for strengths/weaknesses
  const subjectAnalyses: SubjectAnalysis[] = Object.entries(subjectData).map(
    ([subject, data]) => {
      const avg = Math.round(data.total / data.count);
      const recentAvg =
        data.recent.length > 0
          ? data.recent.reduce((s, v) => s + v, 0) / data.recent.length
          : avg;
      const olderAvg =
        data.older.length > 0
          ? data.older.reduce((s, v) => s + v, 0) / data.older.length
          : avg;
      const trend = Math.round(recentAvg - olderAvg);
      return {
        subject: subject as Subject,
        averagePercent: avg,
        trend,
        count: data.count,
      };
    }
  );

  // ── Overall stats ──────────────────────────────────────────────────────────

  const totalAttempts = allSubmissions.length;
  const overallAverage =
    scoredSubmissions.length > 0
      ? Math.round(
          scoredSubmissions.reduce(
            (sum, s) => sum + (s.score! / s.max_score!) * 100,
            0
          ) / scoredSubmissions.length
        )
      : 0;

  // ── Study streak ───────────────────────────────────────────────────────────

  const today = new Date();
  const submissionDates = new Map<string, number>();
  for (const s of allSubmissions) {
    const dateStr = new Date(s.created_at).toISOString().split("T")[0];
    submissionDates.set(dateStr, (submissionDates.get(dateStr) ?? 0) + 1);
  }

  // Current streak
  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (submissionDates.has(dateStr)) {
      currentStreak++;
    } else if (i > 0) {
      break;
    }
  }

  // Longest streak (look back 1 year)
  let longestStreak = 0;
  let tempStreak = 0;
  for (let i = 365; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (submissionDates.has(dateStr)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  const streakData: StudyStreakData = {
    dailyCounts: Object.fromEntries(submissionDates),
    currentStreak,
    longestStreak,
  };

  // ── Score trend line (overall, by submission order) ─────────────────────────

  const scoreTrendAttempts: ScoreComparisonAttempt[] = scoredSubmissions.map(
    (s, i) => ({
      attempt: i + 1,
      scorePercent: Math.round((s.score! / s.max_score!) * 100),
      date: s.created_at,
    })
  );

  const scoreTrendData: ScoreComparisonData | null =
    scoreTrendAttempts.length >= 2
      ? {
          userAttempts: scoreTrendAttempts,
          allStudentAverage: overallAverage,
          top10Threshold: Math.min(
            100,
            overallAverage + 20
          ),
          percentileRank: 50,
          totalSubmissions: scoreTrendAttempts.length,
        }
      : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "マイページ", href: "/dashboard" },
          { label: "学習分析", href: "/dashboard/analytics" },
        ]}
      />
      <h1 className="mb-6 text-2xl font-bold tracking-tight">学習分析</h1>

      {totalAttempts < 3 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-2 text-lg font-medium">
              もっと問題を解いて、分析データを蓄積しましょう
            </p>
            <p className="text-sm text-muted-foreground">
              3回以上の採点結果があると、詳細な分析が表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  総回答回数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalAttempts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  平均正答率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{overallAverage}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  学習科目数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{subjectAverages.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  連続学習日数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{currentStreak}日</p>
              </CardContent>
            </Card>
          </div>

          {/* Study streak heatmap */}
          <StudyStreak data={streakData} />

          {/* Score trend + Subject radar side by side on desktop */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Score trend line chart */}
            {scoreTrendData ? (
              <ScoreComparison data={scoreTrendData} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">スコア推移</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      2回以上の採点結果があるとスコア推移が表示されます
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subject radar */}
            <SubjectRadar subjects={radarSubjects} />
          </div>

          {/* Strengths / weaknesses */}
          <StrengthsWeaknesses subjects={subjectAnalyses} />

          {/* Per-subject breakdown (existing, kept) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">科目別正答率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjectAverages.map((s) => (
                  <div key={s.subject} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {SUBJECT_LABELS[s.subject]}
                      </span>
                      <span className="text-muted-foreground">
                        {s.average}% ({s.count}回)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${s.average}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
