"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AnswerType, Subject, Difficulty, Json } from "@/types/database";

// ─── Video metadata shape stored in questions.video_urls ──────────────
interface VideoMeta {
  url: string;
  path: string;
  title: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function requireOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questionId: string,
  userId: string
) {
  const { data, error } = await supabase.from("questions")
    .select("id, seller_id, video_urls")
    .eq("id", questionId)
    .single();

  if (error || !data) {
    return { question: null, error: "問題が見つかりません" };
  }

  if ((data as { seller_id: string }).seller_id !== userId) {
    return { question: null, error: "この問題を編集する権限がありません" };
  }

  return { question: data as unknown as { id: string; seller_id: string; video_urls: VideoMeta[] }, error: null };
}

// ─── updateQuestion ───────────────────────────────────────────────────

export async function updateQuestion(questionId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // Verify ownership
  const ownership = await requireOwnership(supabase, questionId, user.id);
  if (ownership.error) return { error: ownership.error };

  const questionType = formData.get("question_type") as string;
  const questionText = formData.get("question_text") as string;
  const subject = formData.get("subject") as string;
  const difficulty = formData.get("difficulty") as string;
  const points = parseInt(formData.get("points") as string, 10) || 10;
  const modelAnswer = formData.get("model_answer") as string;
  const verticalText = formData.get("vertical_text") === "true";
  const estimatedMinutes = formData.get("estimated_minutes") as string;
  const topicTags = formData.get("topic_tags") as string;

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
    .update({
      question_type: questionType as AnswerType,
      question_text: questionText,
      subject: subject as Subject,
      difficulty: difficulty as Difficulty,
      points,
      model_answer: modelAnswer || null,
      vertical_text: verticalText,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      topic_tags: topicTags
        ? topicTags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [],
      rubric: rubric as unknown as Json,
    })
    .eq("id", questionId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "問題の更新に失敗しました" };
  }

  revalidatePath("/seller/pool");
  revalidatePath(`/seller/pool/${questionId}/edit`);
  return { success: true };
}

// ─── deleteQuestion ───────────────────────────────────────────────────

export async function deleteQuestion(questionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // Verify ownership
  const ownership = await requireOwnership(supabase, questionId, user.id);
  if (ownership.error) return { error: ownership.error };

  // Check if question is used in any published problem sets
  const { data: usages } = await supabase.from("problem_set_questions")
    .select("problem_set_id")
    .eq("question_id", questionId);

  if (usages && usages.length > 0) {
    return {
      error: `この問題は ${usages.length} 個の問題セットで使用されています。先に問題セットから取り除いてください。`,
    };
  }

  // Delete associated videos from storage
  const question = ownership.question!;
  const videos = (question.video_urls ?? []) as VideoMeta[];
  if (videos.length > 0) {
    const paths = videos.map((v) => v.path);
    await supabase.storage.from("question-videos").remove(paths);
  }

  const { error } = await supabase.from("questions")
    .delete()
    .eq("id", questionId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "問題の削除に失敗しました" };
  }

  revalidatePath("/seller/pool");
  redirect("/seller/pool");
}

// ─── uploadVideo ──────────────────────────────────────────────────────

export async function uploadVideo(questionId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // Verify ownership
  const ownership = await requireOwnership(supabase, questionId, user.id);
  if (ownership.error) return { error: ownership.error };

  const question = ownership.question!;
  const existingVideos = (question.video_urls ?? []) as VideoMeta[];

  if (existingVideos.length >= 3) {
    return { error: "動画は最大3つまでアップロードできます" };
  }

  const file = formData.get("video") as File;
  const title = (formData.get("title") as string) || "解説動画";

  if (!file || !(file instanceof File)) {
    return { error: "ファイルが選択されていません" };
  }

  const validTypes = ["video/mp4", "video/webm"];
  if (!validTypes.includes(file.type)) {
    return { error: "mp4またはwebm形式のみ対応しています" };
  }

  if (file.size > 500 * 1024 * 1024) {
    return { error: "ファイルサイズは500MB以下にしてください" };
  }

  // Sanitize filename: remove special characters, keep extension
  const ext = file.name.split(".").pop() ?? "mp4";
  const sanitizedName = `video_${existingVideos.length}_${Date.now()}.${ext}`;
  const storagePath = `${user.id}/${questionId}/${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from("question-videos")
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    return { error: `アップロードに失敗しました: ${uploadError.message}` };
  }

  // Get the signed URL (bucket is private, so we use createSignedUrl for access)
  const { data: urlData } = await supabase.storage
    .from("question-videos")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10); // 10 years

  if (!urlData?.signedUrl) {
    return { error: "URLの生成に失敗しました" };
  }

  const newVideo: VideoMeta = {
    url: urlData.signedUrl,
    path: storagePath,
    title,
    size_bytes: file.size,
    mime_type: file.type,
    uploaded_at: new Date().toISOString(),
  };

  const updatedVideos = [...existingVideos, newVideo];

  const { error: updateError } = await supabase.from("questions")
    .update({ video_urls: updatedVideos as unknown as Json })
    .eq("id", questionId)
    .eq("seller_id", user.id);

  if (updateError) {
    // Rollback: remove the uploaded file
    await supabase.storage.from("question-videos").remove([storagePath]);
    return { error: "動画情報の保存に失敗しました" };
  }

  revalidatePath(`/seller/pool/${questionId}/edit`);
  return { success: true, video: newVideo };
}

// ─── removeVideo ──────────────────────────────────────────────────────

export async function removeVideo(questionId: string, videoIndex: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // Verify ownership
  const ownership = await requireOwnership(supabase, questionId, user.id);
  if (ownership.error) return { error: ownership.error };

  const question = ownership.question!;
  const existingVideos = (question.video_urls ?? []) as VideoMeta[];

  if (videoIndex < 0 || videoIndex >= existingVideos.length) {
    return { error: "無効な動画インデックスです" };
  }

  const videoToRemove = existingVideos[videoIndex];

  // Remove from storage
  if (videoToRemove.path) {
    await supabase.storage.from("question-videos").remove([videoToRemove.path]);
  }

  // Update question record
  const updatedVideos = existingVideos.filter((_, i) => i !== videoIndex);

  const { error: updateError } = await supabase.from("questions")
    .update({ video_urls: updatedVideos as unknown as Json })
    .eq("id", questionId)
    .eq("seller_id", user.id);

  if (updateError) {
    return { error: "動画情報の更新に失敗しました" };
  }

  revalidatePath(`/seller/pool/${questionId}/edit`);
  return { success: true };
}

// ─── reorderVideos ────────────────────────────────────────────────────

export async function reorderVideos(questionId: string, newOrder: number[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // Verify ownership
  const ownership = await requireOwnership(supabase, questionId, user.id);
  if (ownership.error) return { error: ownership.error };

  const question = ownership.question!;
  const existingVideos = (question.video_urls ?? []) as VideoMeta[];

  // Validate that newOrder is a valid permutation
  if (newOrder.length !== existingVideos.length) {
    return { error: "無効な並び替え指定です" };
  }

  const sorted = [...newOrder].sort((a, b) => a - b);
  const expected = Array.from({ length: existingVideos.length }, (_, i) => i);
  if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
    return { error: "無効な並び替え指定です" };
  }

  const reorderedVideos = newOrder.map((idx) => existingVideos[idx]);

  const { error: updateError } = await supabase.from("questions")
    .update({ video_urls: reorderedVideos as unknown as Json })
    .eq("id", questionId)
    .eq("seller_id", user.id);

  if (updateError) {
    return { error: "並び替えの保存に失敗しました" };
  }

  revalidatePath(`/seller/pool/${questionId}/edit`);
  return { success: true };
}

// ─── updateVideoTitle ─────────────────────────────────────────────────

export async function updateVideoTitle(
  questionId: string,
  videoIndex: number,
  title: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const ownership = await requireOwnership(supabase, questionId, user.id);
  if (ownership.error) return { error: ownership.error };

  const question = ownership.question!;
  const existingVideos = (question.video_urls ?? []) as VideoMeta[];

  if (videoIndex < 0 || videoIndex >= existingVideos.length) {
    return { error: "無効な動画インデックスです" };
  }

  const updatedVideos = existingVideos.map((v, i) =>
    i === videoIndex ? { ...v, title: title.trim() || "解説動画" } : v
  );

  const { error: updateError } = await supabase.from("questions")
    .update({ video_urls: updatedVideos as unknown as Json })
    .eq("id", questionId)
    .eq("seller_id", user.id);

  if (updateError) {
    return { error: "タイトルの更新に失敗しました" };
  }

  revalidatePath(`/seller/pool/${questionId}/edit`);
  return { success: true };
}
