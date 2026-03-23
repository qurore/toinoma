import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";
import type { Metadata } from "next";

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
    .order("created_at", { ascending: false });

  const allSubmissions = submissions ?? [];

  // Fetch problem set subjects
  const setIds = [...new Set(allSubmissions.map((s) => s.problem_set_id))];
  const { data: sets } = setIds.length > 0
    ? await supabase
        .from("problem_sets")
        .select("id, subject")
        .in("id", setIds)
    : { data: [] };

  const setSubjectMap = new Map(
    (sets ?? []).map((s) => [s.id, s.subject as Subject])
  );

  // Calculate per-subject averages
  const subjectScores: Record<string, { total: number; count: number }> = {};
  for (const sub of allSubmissions) {
    if (sub.score == null || sub.max_score == null || sub.max_score === 0) continue;
    const subject = setSubjectMap.get(sub.problem_set_id);
    if (!subject) continue;
    if (!subjectScores[subject]) {
      subjectScores[subject] = { total: 0, count: 0 };
    }
    subjectScores[subject].total += (sub.score / sub.max_score) * 100;
    subjectScores[subject].count += 1;
  }

  const subjectAverages = Object.entries(subjectScores)
    .map(([subject, data]) => ({
      subject: subject as Subject,
      average: Math.round(data.total / data.count),
      count: data.count,
    }))
    .sort((a, b) => b.average - a.average);

  // Overall stats
  const totalAttempts = allSubmissions.length;
  const scoredSubmissions = allSubmissions.filter(
    (s) => s.score != null && s.max_score != null && s.max_score > 0
  );
  const overallAverage =
    scoredSubmissions.length > 0
      ? Math.round(
          scoredSubmissions.reduce(
            (sum, s) => sum + (s.score! / s.max_score!) * 100,
            0
          ) / scoredSubmissions.length
        )
      : 0;

  // Study streak (consecutive days with submissions)
  const today = new Date();
  let streak = 0;
  const submissionDates = new Set(
    allSubmissions.map((s) =>
      new Date(s.created_at).toISOString().split("T")[0]
    )
  );
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (submissionDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return (
    <div>
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
        <>
          {/* Stats cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="text-2xl font-bold">{streak}日</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-subject breakdown */}
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
        </>
      )}
    </div>
  );
}
