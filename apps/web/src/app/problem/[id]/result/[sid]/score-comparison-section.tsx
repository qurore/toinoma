import { createClient } from "@/lib/supabase/server";
import {
  ScoreComparison,
  type ScoreComparisonData,
} from "@/components/solving/score-comparison";

interface ScoreComparisonSectionProps {
  problemSetId: string;
  userId: string;
}

/**
 * Server component that fetches aggregate submission data for a problem set,
 * computes percentile rank and comparison stats, then passes them to the
 * client-rendered ScoreComparison chart.
 */
export async function ScoreComparisonSection({
  problemSetId,
  userId,
}: ScoreComparisonSectionProps) {
  const supabase = await createClient();

  // Fetch all scored submissions for this problem set (all users)
  const { data: allSubmissions } = await supabase
    .from("submissions")
    .select("id, user_id, score, max_score, created_at")
    .eq("problem_set_id", problemSetId)
    .not("score", "is", null)
    .not("max_score", "is", null)
    .order("created_at", { ascending: true });

  const submissions = (allSubmissions ?? []).filter(
    (s) => s.score != null && s.max_score != null && s.max_score! > 0
  );

  // Not enough data for comparison — pass null to show fallback
  if (submissions.length < 5) {
    return <ScoreComparison data={null} />;
  }

  // Compute score percentages for all submissions
  const allScorePercents = submissions.map(
    (s) => Math.round((s.score! / s.max_score!) * 100)
  );

  // All-student average
  const allStudentAverage = Math.round(
    allScorePercents.reduce((sum, p) => sum + p, 0) / allScorePercents.length
  );

  // Top 10% threshold
  const sorted = [...allScorePercents].sort((a, b) => b - a);
  const top10Index = Math.max(0, Math.ceil(sorted.length * 0.1) - 1);
  const top10Threshold = sorted[top10Index];

  // User's submissions for this problem set, ordered by creation date
  const userSubmissions = submissions.filter((s) => s.user_id === userId);
  const userAttempts = userSubmissions.map((s, i) => ({
    attempt: i + 1,
    scorePercent: Math.round((s.score! / s.max_score!) * 100),
    date: s.created_at,
  }));

  // Calculate user's percentile rank based on their best score
  const userBestScore =
    userAttempts.length > 0
      ? Math.max(...userAttempts.map((a) => a.scorePercent))
      : 0;

  // Percentile: percentage of all scores that the user's best score is >= to
  // Deduplicate by taking each user's best score for fair comparison
  const userBestScores = new Map<string, number>();
  for (const s of submissions) {
    const pct = Math.round((s.score! / s.max_score!) * 100);
    const existing = userBestScores.get(s.user_id);
    if (existing === undefined || pct > existing) {
      userBestScores.set(s.user_id, pct);
    }
  }

  const allUserBests = [...userBestScores.values()];
  const belowOrEqual = allUserBests.filter(
    (score) => score <= userBestScore
  ).length;
  const percentileRank = Math.round(
    (belowOrEqual / allUserBests.length) * 100
  );

  const data: ScoreComparisonData = {
    userAttempts,
    allStudentAverage,
    top10Threshold,
    percentileRank,
    totalSubmissions: submissions.length,
  };

  return <ScoreComparison data={data} />;
}
