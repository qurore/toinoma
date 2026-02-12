import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeSubmission } from "@/lib/ai/grading";
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
    answers: Record<string, string>;
  };

  if (!problemSetId || !answers) {
    return NextResponse.json(
      { error: "Missing problemSetId or answers" },
      { status: 400 }
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

  // Grade with AI
  const result = await gradeSubmission({
    rubric: problemSet.rubric as Record<string, unknown>,
    studentAnswers: answers,
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

  return NextResponse.json({
    submissionId: submission.id,
    result,
  });
}
