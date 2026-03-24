"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyQaQuestion, notifyQaAnswer } from "@/lib/notifications";

// ── Create a Q&A question ──────────────────────────────────────────────
interface CreateQaQuestionInput {
  problemSetId: string;
  title: string;
  body: string;
  questionId?: string | null;
}

export async function createQaQuestion({
  problemSetId,
  title,
  body,
  questionId,
}: CreateQaQuestionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  if (!trimmedTitle || trimmedTitle.length < 5) {
    return { error: "タイトルは5文字以上で入力してください" };
  }
  if (trimmedTitle.length > 200) {
    return { error: "タイトルは200文字以内で入力してください" };
  }
  if (!trimmedBody || trimmedBody.length < 10) {
    return { error: "質問内容は10文字以上で入力してください" };
  }
  if (trimmedBody.length > 2000) {
    return { error: "質問内容は2000文字以内で入力してください" };
  }

  // Verify the problem set exists
  const { data: problemSet } = await supabase
    .from("problem_sets")
    .select("id")
    .eq("id", problemSetId)
    .single();

  if (!problemSet) {
    return { error: "問題セットが見つかりません" };
  }

  const { error } = await supabase.from("qa_questions").insert({
    problem_set_id: problemSetId,
    user_id: user.id,
    title: trimmedTitle,
    body: trimmedBody,
    question_id: questionId ?? null,
  });

  if (error) {
    return { error: "質問の投稿に失敗しました" };
  }

  // Notify seller of new question (fire-and-forget)
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("seller_id")
    .eq("id", problemSetId)
    .single();

  if (ps && ps.seller_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const askerName = profile?.display_name ?? "ユーザー";
    notifyQaQuestion(ps.seller_id, askerName, trimmedTitle, problemSetId).catch(
      () => {}
    );
  }

  revalidatePath(`/problem/${problemSetId}`);
  return { success: true };
}

// ── Create a Q&A answer ────────────────────────────────────────────────
interface CreateQaAnswerInput {
  qaQuestionId: string;
  problemSetId: string;
  body: string;
}

export async function createQaAnswer({
  qaQuestionId,
  problemSetId,
  body,
}: CreateQaAnswerInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const trimmedBody = body.trim();

  if (!trimmedBody || trimmedBody.length < 5) {
    return { error: "回答は5文字以上で入力してください" };
  }
  if (trimmedBody.length > 2000) {
    return { error: "回答は2000文字以内で入力してください" };
  }

  // Verify the question exists and belongs to the problem set
  const { data: question } = await supabase
    .from("qa_questions")
    .select("id, problem_set_id")
    .eq("id", qaQuestionId)
    .single();

  if (!question) {
    return { error: "質問が見つかりません" };
  }

  const { error } = await supabase.from("qa_answers").insert({
    qa_question_id: qaQuestionId,
    user_id: user.id,
    body: trimmedBody,
  });

  if (error) {
    return { error: "回答の投稿に失敗しました" };
  }

  // Notify question asker of new answer (fire-and-forget)
  if (question.problem_set_id) {
    const { data: qaQuestion } = await supabase
      .from("qa_questions")
      .select("user_id, title")
      .eq("id", qaQuestionId)
      .single();

    if (qaQuestion && qaQuestion.user_id !== user.id) {
      const { data: answererProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      const answererName = answererProfile?.display_name ?? "ユーザー";
      notifyQaAnswer(
        qaQuestion.user_id,
        answererName,
        qaQuestion.title,
        problemSetId
      ).catch(() => {});
    }
  }

  revalidatePath(`/problem/${problemSetId}`);
  return { success: true };
}

// ── Toggle upvote on an answer ─────────────────────────────────────────
interface ToggleUpvoteInput {
  qaAnswerId: string;
  problemSetId: string;
}

export async function toggleUpvote({
  qaAnswerId,
  problemSetId,
}: ToggleUpvoteInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Check if already upvoted
  const { data: existing } = await supabase
    .from("qa_upvotes")
    .select("id")
    .eq("qa_answer_id", qaAnswerId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Remove upvote
    const { error: deleteError } = await supabase
      .from("qa_upvotes")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      return { error: "投票の取り消しに失敗しました" };
    }

    // Decrement upvotes counter on qa_answers
    const { data: answer } = await supabase
      .from("qa_answers")
      .select("upvotes")
      .eq("id", qaAnswerId)
      .single();

    if (answer) {
      await supabase
        .from("qa_answers")
        .update({ upvotes: Math.max(0, (answer.upvotes ?? 0) - 1) })
        .eq("id", qaAnswerId);
    }

    revalidatePath(`/problem/${problemSetId}`);
    return { success: true, upvoted: false };
  }

  // Add upvote
  const { error: insertError } = await supabase.from("qa_upvotes").insert({
    qa_answer_id: qaAnswerId,
    user_id: user.id,
  });

  if (insertError) {
    return { error: "投票に失敗しました" };
  }

  // Increment upvotes counter on qa_answers
  const { data: answer } = await supabase
    .from("qa_answers")
    .select("upvotes")
    .eq("id", qaAnswerId)
    .single();

  if (answer) {
    await supabase
      .from("qa_answers")
      .update({ upvotes: (answer.upvotes ?? 0) + 1 })
      .eq("id", qaAnswerId);
  }

  revalidatePath(`/problem/${problemSetId}`);
  return { success: true, upvoted: true };
}

// ── Toggle pinned status on a question (seller only) ───────────────────
interface TogglePinnedInput {
  qaQuestionId: string;
  problemSetId: string;
}

export async function togglePinned({
  qaQuestionId,
  problemSetId,
}: TogglePinnedInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Verify the user is the seller of this problem set
  const { data: problemSet } = await supabase
    .from("problem_sets")
    .select("seller_id")
    .eq("id", problemSetId)
    .single();

  if (!problemSet || problemSet.seller_id !== user.id) {
    return { error: "出品者のみピン留めできます" };
  }

  // Get current pinned state
  const { data: question } = await supabase
    .from("qa_questions")
    .select("pinned")
    .eq("id", qaQuestionId)
    .single();

  if (!question) {
    return { error: "質問が見つかりません" };
  }

  const { error } = await supabase
    .from("qa_questions")
    .update({ pinned: !question.pinned })
    .eq("id", qaQuestionId);

  if (error) {
    return { error: "ピン留めの変更に失敗しました" };
  }

  revalidatePath(`/problem/${problemSetId}`);
  return { success: true, pinned: !question.pinned };
}

// ── Mark an answer as accepted (seller only) ───────────────────────────
interface MarkAcceptedInput {
  qaAnswerId: string;
  qaQuestionId: string;
  problemSetId: string;
}

export async function markAccepted({
  qaAnswerId,
  qaQuestionId,
  problemSetId,
}: MarkAcceptedInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Verify the user is the seller of this problem set
  const { data: problemSet } = await supabase
    .from("problem_sets")
    .select("seller_id")
    .eq("id", problemSetId)
    .single();

  if (!problemSet || problemSet.seller_id !== user.id) {
    return { error: "出品者のみベストアンサーを選べます" };
  }

  // Get current accepted state of the target answer
  const { data: targetAnswer } = await supabase
    .from("qa_answers")
    .select("is_accepted")
    .eq("id", qaAnswerId)
    .single();

  if (!targetAnswer) {
    return { error: "回答が見つかりません" };
  }

  if (targetAnswer.is_accepted) {
    // Un-accept
    const { error } = await supabase
      .from("qa_answers")
      .update({ is_accepted: false })
      .eq("id", qaAnswerId);

    if (error) {
      return { error: "ベストアンサーの取り消しに失敗しました" };
    }
  } else {
    // Remove existing accepted answer for this question, then accept new one
    await supabase
      .from("qa_answers")
      .update({ is_accepted: false })
      .eq("qa_question_id", qaQuestionId);

    const { error } = await supabase
      .from("qa_answers")
      .update({ is_accepted: true })
      .eq("id", qaAnswerId);

    if (error) {
      return { error: "ベストアンサーの選択に失敗しました" };
    }
  }

  revalidatePath(`/problem/${problemSetId}`);
  return { success: true };
}
