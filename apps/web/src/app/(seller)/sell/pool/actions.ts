"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AnswerType, Subject, Difficulty, Json } from "@/types/database";

export async function createQuestion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const questionType = formData.get("question_type") as string;
  const questionText = formData.get("question_text") as string;
  const subject = formData.get("subject") as string;
  const difficulty = formData.get("difficulty") as string;
  const points = parseInt(formData.get("points") as string, 10) || 10;
  const modelAnswer = formData.get("model_answer") as string;
  const verticalText = formData.get("vertical_text") === "true";

  if (!questionType || !questionText || !subject || !difficulty) {
    return { error: "必須項目を入力してください" };
  }

  // Build rubric based on question type
  let rubric: Record<string, unknown> = {};

  if (questionType === "essay") {
    const rubricJson = formData.get("rubric_json") as string;
    try {
      rubric = rubricJson ? JSON.parse(rubricJson) : { type: "essay", rubric_elements: [] };
    } catch {
      rubric = { type: "essay", rubric_elements: [] };
    }
  } else if (questionType === "mark_sheet") {
    const choices = formData.get("choices") as string;
    const correctAnswers = formData.get("correct_answers") as string;
    rubric = {
      type: "mark_sheet",
      choices: choices ? choices.split(",").map((c) => c.trim()) : [],
      correct_answers: correctAnswers ? correctAnswers.split(",").map((c) => c.trim()) : [],
      scoring_mode: "all_or_nothing",
    };
  } else if (questionType === "fill_in_blank") {
    const blanksJson = formData.get("blanks_json") as string;
    try {
      rubric = blanksJson ? JSON.parse(blanksJson) : { type: "fill_in_blank", blanks: [] };
    } catch {
      rubric = { type: "fill_in_blank", blanks: [] };
    }
  } else if (questionType === "multiple_choice") {
    const optionsJson = formData.get("options_json") as string;
    const correctIds = formData.get("correct_option_ids") as string;
    try {
      rubric = {
        type: "multiple_choice",
        options: optionsJson ? JSON.parse(optionsJson) : [],
        correct_option_ids: correctIds ? correctIds.split(",").map((c) => c.trim()) : [],
        select_mode: "single",
      };
    } catch {
      rubric = { type: "multiple_choice", options: [], correct_option_ids: [] };
    }
  }

  const { error } = await supabase.from("questions")
    .insert({
      seller_id: user.id,
      question_type: questionType as AnswerType,
      question_text: questionText,
      subject: subject as Subject,
      difficulty: difficulty as Difficulty,
      points,
      model_answer: modelAnswer || null,
      vertical_text: verticalText,
      rubric: rubric as unknown as Json,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "問題の作成に失敗しました" };
  }

  revalidatePath("/sell/pool");
  redirect("/sell/pool");
}

export async function deleteQuestion(questionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("questions")
    .delete()
    .eq("id", questionId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "問題の削除に失敗しました" };
  }

  revalidatePath("/sell/pool");
  return { success: true };
}

export async function addQuestionToSet(problemSetId: string, questionId: string, sectionNumber: number, position: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("problem_set_questions")
    .insert({
      problem_set_id: problemSetId,
      question_id: questionId,
      section_number: sectionNumber,
      position,
    });

  if (error) {
    if (error.code === "23505") {
      return { error: "この問題は既に追加されています" };
    }
    return { error: "問題の追加に失敗しました" };
  }

  revalidatePath(`/sell/${problemSetId}/edit`);
  return { success: true };
}

export async function removeQuestionFromSet(problemSetId: string, questionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("problem_set_questions")
    .delete()
    .eq("problem_set_id", problemSetId)
    .eq("question_id", questionId);

  if (error) {
    return { error: "問題の削除に失敗しました" };
  }

  revalidatePath(`/sell/${problemSetId}/edit`);
  return { success: true };
}

export async function duplicateQuestion(questionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // Fetch the original question with explicit columns
  const { data: original } = await supabase
    .from("questions")
    .select("question_type, question_text, question_images, rubric, model_answer, model_answer_images, subject, topic_tags, difficulty, estimated_minutes, points, video_urls, vertical_text")
    .eq("id", questionId)
    .eq("seller_id", user.id)
    .single();

  if (!original) return { error: "問題が見つかりません" };

  // Create a copy with "(コピー)" suffix
  const { data: copy, error: insertError } = await supabase
    .from("questions")
    .insert({
      seller_id: user.id,
      question_type: original.question_type,
      question_text: `${original.question_text}（コピー）`,
      question_images: original.question_images,
      rubric: original.rubric,
      model_answer: original.model_answer,
      model_answer_images: original.model_answer_images,
      subject: original.subject,
      topic_tags: original.topic_tags,
      difficulty: original.difficulty,
      estimated_minutes: original.estimated_minutes,
      points: original.points,
      video_urls: original.video_urls,
      vertical_text: original.vertical_text,
    })
    .select("id")
    .single();

  if (insertError || !copy) {
    return { error: "問題の複製に失敗しました" };
  }

  revalidatePath("/sell/pool");
  return { success: true, newId: copy.id };
}
