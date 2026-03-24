"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ProblemSetInsert = Database["public"]["Tables"]["problem_sets"]["Insert"];
type ProblemSetQuestionInsert =
  Database["public"]["Tables"]["problem_set_questions"]["Insert"];

// Shape of a question within a section, as sent from the client
interface ComposedQuestion {
  questionId: string;
  position: number;
  pointsOverride: number | null;
}

// Shape of a section, as sent from the client
interface ComposedSection {
  sectionNumber: number;
  sectionTitle: string;
  questions: ComposedQuestion[];
}

// Full payload from the set composer
interface CreateProblemSetFromPoolPayload {
  title: string;
  description: string | null;
  subject: string;
  difficulty: string;
  price: number;
  timeLimitMinutes: number | null;
  coverImageUrl: string | null;
  university: string | null;
  sections: ComposedSection[];
}

/**
 * Creates a problem_set and all associated problem_set_questions
 * in a single transaction-like operation.
 */
export async function createProblemSetFromPool(
  payload: CreateProblemSetFromPoolPayload
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // Validate required fields
  if (!payload.title.trim()) {
    return { error: "タイトルを入力してください" };
  }
  if (!payload.subject) {
    return { error: "教科を選択してください" };
  }
  if (!payload.difficulty) {
    return { error: "難易度を選択してください" };
  }

  // Validate at least one question
  const totalQuestions = payload.sections.reduce(
    (acc, s) => acc + s.questions.length,
    0
  );
  if (totalQuestions === 0) {
    return { error: "少なくとも1つの問題を追加してください" };
  }

  // Collect all question IDs to verify ownership
  const allQuestionIds = payload.sections.flatMap((s) =>
    s.questions.map((q) => q.questionId)
  );

  // Check for duplicates
  const uniqueIds = new Set(allQuestionIds);
  if (uniqueIds.size !== allQuestionIds.length) {
    return { error: "同じ問題が複数回追加されています" };
  }

  // Verify all questions belong to this seller
  const { data: ownedQuestions, error: verifyError } = await supabase
    .from("questions")
    .select("id, points")
    .eq("seller_id", user.id)
    .in("id", allQuestionIds);

  if (verifyError) {
    return { error: "問題の検証に失敗しました" };
  }

  if (!ownedQuestions || ownedQuestions.length !== allQuestionIds.length) {
    return { error: "一部の問題が見つからないか、アクセス権がありません" };
  }

  // Build a points lookup map for total_points calculation
  const pointsMap = new Map(
    ownedQuestions.map((q) => [q.id, q.points])
  );

  // Calculate total points
  const totalPoints = payload.sections.reduce((acc, section) => {
    return (
      acc +
      section.questions.reduce((qAcc, q) => {
        const effectivePoints =
          q.pointsOverride ?? pointsMap.get(q.questionId) ?? 0;
        return qAcc + effectivePoints;
      }, 0)
    );
  }, 0);

  // Create the problem set
  const insert: ProblemSetInsert = {
    seller_id: user.id,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    subject: payload.subject as ProblemSetInsert["subject"],
    university: payload.university?.trim() || null,
    difficulty: payload.difficulty as ProblemSetInsert["difficulty"],
    price: Math.max(0, payload.price),
    status: "draft",
    time_limit_minutes: payload.timeLimitMinutes,
    cover_image_url: payload.coverImageUrl,
    total_points: totalPoints,
  };

  const { data: problemSet, error: createError } = await supabase
    .from("problem_sets")
    .insert(insert)
    .select("id")
    .single();

  if (createError || !problemSet) {
    return { error: "問題セットの作成に失敗しました" };
  }

  // Build all junction records
  const junctionRows: ProblemSetQuestionInsert[] = payload.sections.flatMap(
    (section) =>
      section.questions.map((q) => ({
        problem_set_id: problemSet.id,
        question_id: q.questionId,
        section_number: section.sectionNumber,
        section_title: section.sectionTitle || null,
        position: q.position,
        points_override: q.pointsOverride,
      }))
  );

  const { error: junctionError } = await supabase
    .from("problem_set_questions")
    .insert(junctionRows);

  if (junctionError) {
    // Clean up the problem set if junction insert fails
    await supabase.from("problem_sets").delete().eq("id", problemSet.id);
    return { error: "問題の関連付けに失敗しました" };
  }

  revalidatePath("/sell");
  redirect(`/sell/${problemSet.id}/edit`);
}
