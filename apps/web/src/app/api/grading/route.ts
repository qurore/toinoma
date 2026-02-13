import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeSubmission } from "@/lib/ai/grading-engine";
import { getSubscriptionState } from "@/lib/subscription";
import { problemSetRubricSchema, type QuestionAnswer } from "@toinoma/shared/schemas";
import type { Json } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { problemSetId, answers } = body as {
    problemSetId: string;
    answers: Record<string, QuestionAnswer>;
  };

  if (!problemSetId || !answers) {
    return NextResponse.json(
      { error: "Missing problemSetId or answers" },
      { status: 400 }
    );
  }

  // FR-030: Check subscription grading limits
  const subState = await getSubscriptionState(user.id);
  if (!subState.canGrade) {
    return NextResponse.json(
      {
        error: "今月のAI採点回数の上限に達しました。プランをアップグレードしてください。",
        code: "GRADING_LIMIT_REACHED",
        gradingsUsed: subState.gradingsUsedThisMonth,
        gradingLimit: subState.gradingLimit,
      },
      { status: 429 }
    );
  }

  // Verify purchase
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_set_id", problemSetId)
    .single();

  if (!purchase) {
    return NextResponse.json(
      { error: "Problem set not purchased" },
      { status: 403 }
    );
  }

  // Fetch problem set rubric
  const { data: problemSet } = await supabase
    .from("problem_sets")
    .select("rubric")
    .eq("id", problemSetId)
    .single();

  if (!problemSet?.rubric) {
    return NextResponse.json(
      { error: "Problem set or rubric not found" },
      { status: 404 }
    );
  }

  // Validate rubric structure
  const rubricResult = problemSetRubricSchema.safeParse(problemSet.rubric);
  if (!rubricResult.success) {
    return NextResponse.json(
      { error: "Invalid rubric format" },
      { status: 500 }
    );
  }

  // Grade with the dispatch engine
  const result = await gradeSubmission({
    rubric: rubricResult.data,
    answers,
  });

  // Store submission
  const { data: submission, error: insertError } = await supabase
    .from("submissions")
    .insert({
      user_id: user.id,
      problem_set_id: problemSetId,
      answers: answers as unknown as Json,
      score: result.totalScore,
      max_score: result.maxScore,
      feedback: JSON.parse(JSON.stringify(result)) as Json,
      graded_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to save submission" },
      { status: 500 }
    );
  }

  // FR-031: Track token usage (using admin client to bypass RLS)
  const adminSupabase = createAdminClient();
  await adminSupabase.from("token_usage").insert({
    user_id: user.id,
    submission_id: submission.id,
    tokens_used: result.tokensUsed ?? 0,
    cost_usd: result.costUsd ?? 0,
    model: result.model ?? "gemini-2.0-flash",
  });

  return NextResponse.json({
    submissionId: submission.id,
    result,
  });
}
