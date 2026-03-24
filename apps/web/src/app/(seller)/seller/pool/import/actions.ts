"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AnswerType, Subject, Difficulty, Json } from "@/types/database";
import type { ExtractedQuestion } from "@/app/api/pdf-import/route";

/**
 * Confirm and batch-insert validated questions into the questions table.
 * Only questions marked as accepted are inserted.
 */
export async function confirmImport(
  questions: Array<
    ExtractedQuestion & {
      accepted: boolean;
    }
  >
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です", inserted: 0 };
  }

  // Verify seller status
  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("id, tos_accepted_at")
    .eq("id", user.id)
    .single();

  if (!sellerProfile?.tos_accepted_at) {
    return { error: "出品者登録が完了していません", inserted: 0 };
  }

  // Filter to only accepted questions
  const accepted = questions.filter((q) => q.accepted);

  if (accepted.length === 0) {
    return { error: "インポートする問題が選択されていません", inserted: 0 };
  }

  // Build insert payloads
  const rows = accepted.map((q) => ({
    seller_id: user.id,
    question_type: q.questionType as AnswerType,
    question_text: q.questionText,
    subject: (q.subject ?? "math") as Subject,
    difficulty: (q.difficulty ?? "medium") as Difficulty,
    points: q.points,
    model_answer: q.modelAnswer,
    vertical_text: false,
    rubric: q.rubric as unknown as Json,
  }));

  // Batch insert
  const { data, error } = await supabase.from("questions")
    .insert(rows)
    .select("id");

  if (error) {
    return {
      error: `問題の保存に失敗しました: ${error.message}`,
      inserted: 0,
    };
  }

  revalidatePath("/seller/pool");

  return {
    success: true,
    inserted: data?.length ?? 0,
  };
}
