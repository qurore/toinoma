import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeSubmission } from "@/lib/ai/grading-engine";
import { getSubscriptionState } from "@/lib/subscription";
import { notifyGrading } from "@/lib/notifications";
import { checkAndNotifyUsage } from "@/lib/usage-warnings";
import { rateLimitByUser } from "@/lib/rate-limit";
import { problemSetRubricSchema, type QuestionAnswer } from "@toinoma/shared/schemas";
import type { Json } from "@/types/database";

// Input validation schema
const gradingRequestSchema = z.object({
  problemSetId: z.string().uuid(),
  answers: z.record(
    z.string(),
    z.object({
      type: z.enum(["essay", "mark_sheet", "fill_in_blank", "multiple_choice"]),
    }).passthrough()
  ),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 grading requests per minute per user
  const rateLimitResult = rateLimitByUser(user.id, 5, 60_000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくお待ちください。" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = gradingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request format", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { problemSetId, answers } = parsed.data as {
    problemSetId: string;
    answers: Record<string, QuestionAnswer>;
  };

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

  // Fetch problem set rubric and title
  const { data: problemSet } = await supabase
    .from("problem_sets")
    .select("rubric, title")
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

  // NTF-007: Check usage thresholds and send warning notifications (fire-and-forget)
  checkAndNotifyUsage(
    user.id,
    subState.tier,
    subState.gradingsUsedThisMonth + 1,
    subState.gradingLimit
  ).catch(() => {
    // Non-critical — do not block response
  });

  // Notify user of grading completion (fire-and-forget)
  notifyGrading(
    user.id,
    problemSet.title,
    result.totalScore,
    submission.id,
    problemSetId
  ).catch(() => {
    // Non-critical — do not block response
  });

  return NextResponse.json({
    submissionId: submission.id,
    result,
  });
}
