"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { problemSetRubricSchema } from "@toinoma/shared/schemas";
import { SUBJECTS, DIFFICULTIES } from "@toinoma/shared/constants";
import type { Database } from "@/types/database";

type ProblemSetInsert = Database["public"]["Tables"]["problem_sets"]["Insert"];

// Zod schemas for server action input validation
const problemSetBaseSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルは必須です")
    .max(200, "タイトルは200文字以内で入力してください"),
  description: z.string().max(2000).optional().default(""),
  subject: z.enum(SUBJECTS as unknown as [string, ...string[]], {
    error: "有効な教科を選択してください",
  }),
  university: z.string().max(200).optional().default(""),
  difficulty: z.enum(DIFFICULTIES as unknown as [string, ...string[]], {
    error: "有効な難易度を選択してください",
  }),
  price: z
    .number()
    .int()
    .min(0, "価格は0円以上で設定してください")
    .max(100_000, "価格は100,000円以下で設定してください"),
});

/**
 * Parse FormData through the Zod schema for createProblemSet / updateProblemSet.
 */
function parseFormData(formData: FormData) {
  const raw = {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    subject: (formData.get("subject") as string) ?? "",
    university: (formData.get("university") as string) ?? "",
    difficulty: (formData.get("difficulty") as string) ?? "",
    price: parseInt((formData.get("price") as string) ?? "0", 10),
  };

  // Coerce NaN to 0 before schema validation
  if (isNaN(raw.price)) raw.price = 0;

  return problemSetBaseSchema.safeParse(raw);
}

/**
 * Accept seller Terms of Service.
 * Creates or updates seller_profiles with tos_accepted_at.
 * Called from the ToS modal at /seller.
 */
export async function acceptSellerTos() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const { error } = await supabase.from("seller_profiles").upsert(
    {
      id: user.id,
      seller_display_name: "__pending__",
      tos_accepted_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return { error: "利用規約の同意に失敗しました" };
  }

  revalidatePath("/seller");
  return { success: true };
}

export async function createProblemSet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { title, description, subject, university, difficulty, price } =
    parsed.data;

  const insert: ProblemSetInsert = {
    seller_id: user.id,
    title,
    description: description || null,
    subject: subject as ProblemSetInsert["subject"],
    university: university || null,
    difficulty: difficulty as ProblemSetInsert["difficulty"],
    price,
    status: "draft",
  };

  const { data: created, error } = await supabase
    .from("problem_sets")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    return { error: "問題セットの作成に失敗しました" };
  }

  redirect(`/seller/${created.id}/edit`);
}

export async function updateProblemSet(
  problemSetId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Validate problemSetId format (UUID)
  if (!z.string().uuid().safeParse(problemSetId).success) {
    return { error: "無効な問題セットIDです" };
  }

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { title, description, subject, university, difficulty, price } =
    parsed.data;

  const { error } = await supabase
    .from("problem_sets")
    .update({
      title,
      description: description || null,
      subject: subject as ProblemSetInsert["subject"],
      university: university || null,
      difficulty: difficulty as ProblemSetInsert["difficulty"],
      price,
    })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "問題セットの更新に失敗しました" };
  }

  revalidatePath(`/seller/${problemSetId}/edit`);
  return { success: true };
}

export async function saveRubric(problemSetId: string, rubricJson: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  if (!z.string().uuid().safeParse(problemSetId).success) {
    return { error: "無効な問題セットIDです" };
  }

  let rubric: unknown;
  try {
    rubric = JSON.parse(rubricJson);
  } catch {
    return { error: "ルーブリックの形式が無効です" };
  }

  const result = problemSetRubricSchema.safeParse(rubric);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { error } = await supabase
    .from("problem_sets")
    .update({ rubric: rubric as Database["public"]["Tables"]["problem_sets"]["Row"]["rubric"] })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "ルーブリックの保存に失敗しました" };
  }

  revalidatePath(`/seller/${problemSetId}/rubric`);
  return { success: true };
}

export async function publishProblemSet(
  problemSetId: string,
  attestation?: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  if (!z.string().uuid().safeParse(problemSetId).success) {
    return { error: "無効な問題セットIDです" };
  }

  // FR-017: Originality attestation is required
  if (!attestation) {
    return { error: "オリジナリティの確認が必要です" };
  }

  // FR-016: Publishing rate limiter — max 5 publications per 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentPublishCount } = await supabase
    .from("problem_sets")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", user.id)
    .eq("status", "published")
    .gte("updated_at", oneDayAgo);

  if ((recentPublishCount ?? 0) >= 5) {
    return { error: "24時間以内に公開できる問題セットは5件までです。時間をおいて再度お試しください。" };
  }

  // Verify the problem set has required data for publishing
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("rubric, problem_pdf_url, total_points")
    .eq("id", problemSetId)
    .eq("seller_id", user.id)
    .single();

  if (!ps) return { error: "問題セットが見つかりません" };
  if (!ps.problem_pdf_url)
    return { error: "問題PDFをアップロードしてください" };

  // Check linked questions
  const { count: questionCount } = await supabase
    .from("problem_set_questions")
    .select("id", { count: "exact", head: true })
    .eq("problem_set_id", problemSetId);

  if ((questionCount ?? 0) === 0) {
    return { error: "少なくとも1つの問題を追加してください" };
  }

  // Validate rubric if present (legacy format)
  if (ps.rubric) {
    const rubricResult = problemSetRubricSchema.safeParse(ps.rubric);
    if (!rubricResult.success) {
      return { error: "ルーブリックが有効な形式ではありません" };
    }
  }

  // Verify total points are set
  if ((ps.total_points ?? 0) <= 0) {
    return { error: "合計配点が0点より大きい必要があります" };
  }

  const { error } = await supabase
    .from("problem_sets")
    .update({ status: "published" })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) return { error: "公開に失敗しました" };

  revalidatePath("/seller");
  revalidatePath("/explore");
  return { success: true };
}

export async function unpublishProblemSet(problemSetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  if (!z.string().uuid().safeParse(problemSetId).success) {
    return { error: "無効な問題セットIDです" };
  }

  const { error } = await supabase
    .from("problem_sets")
    .update({ status: "draft" })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) return { error: "非公開への変更に失敗しました" };

  revalidatePath("/seller");
  return { success: true };
}

export async function deleteProblemSet(problemSetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  if (!z.string().uuid().safeParse(problemSetId).success) {
    return { error: "無効な問題セットIDです" };
  }

  // Only allow deleting drafts
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("status")
    .eq("id", problemSetId)
    .eq("seller_id", user.id)
    .single();

  if (!ps) return { error: "問題セットが見つかりません" };
  if (ps.status === "published") {
    return { error: "公開中の問題セットは削除できません。先に非公開にしてください。" };
  }

  const { error } = await supabase
    .from("problem_sets")
    .delete()
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) return { error: "削除に失敗しました" };

  revalidatePath("/seller");
  redirect("/seller");
}

export async function updateProblemPdfUrl(
  problemSetId: string,
  url: string,
  type: "problem" | "solution"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  if (!z.string().uuid().safeParse(problemSetId).success) {
    return { error: "無効な問題セットIDです" };
  }
  if (!z.string().url().safeParse(url).success) {
    return { error: "無効なURLです" };
  }
  if (!z.enum(["problem", "solution"]).safeParse(type).success) {
    return { error: "無効なタイプです" };
  }

  const field =
    type === "problem" ? "problem_pdf_url" : "solution_pdf_url";

  const { error } = await supabase
    .from("problem_sets")
    .update({ [field]: url })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) return { error: "PDF URLの保存に失敗しました" };

  revalidatePath(`/seller/${problemSetId}/edit`);
  return { success: true };
}

export async function updateCoverImageUrl(
  problemSetId: string,
  url: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  if (!z.string().uuid().safeParse(problemSetId).success) {
    return { error: "無効な問題セットIDです" };
  }
  if (url !== null && !z.string().url().safeParse(url).success) {
    return { error: "無効なURLです" };
  }

  const { error } = await supabase
    .from("problem_sets")
    .update({ cover_image_url: url })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) return { error: "カバー画像URLの保存に失敗しました" };

  revalidatePath(`/seller/${problemSetId}/edit`);
  return { success: true };
}

export async function duplicateProblemSet(problemSetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  if (!z.string().uuid().safeParse(problemSetId).success) {
    return { error: "無効な問題セットIDです" };
  }

  // Fetch the original problem set
  const { data: original } = await supabase
    .from("problem_sets")
    .select("title, description, subject, university, difficulty, price, problem_pdf_url, solution_pdf_url, rubric, cover_image_url, time_limit_minutes, total_points, preview_question_ids")
    .eq("id", problemSetId)
    .eq("seller_id", user.id)
    .single();

  if (!original) return { error: "問題セットが見つかりません" };

  // Create a copy with "(コピー)" suffix and draft status
  const { data: copy, error: insertError } = await supabase
    .from("problem_sets")
    .insert({
      seller_id: user.id,
      title: `${original.title}（コピー）`,
      description: original.description,
      subject: original.subject,
      university: original.university,
      difficulty: original.difficulty,
      price: original.price,
      status: "draft" as const,
      problem_pdf_url: original.problem_pdf_url,
      solution_pdf_url: original.solution_pdf_url,
      rubric: original.rubric,
      cover_image_url: original.cover_image_url,
      time_limit_minutes: original.time_limit_minutes,
      total_points: original.total_points,
      preview_question_ids: original.preview_question_ids,
    })
    .select("id")
    .single();

  if (insertError || !copy) {
    return { error: "問題セットの複製に失敗しました" };
  }

  // Copy all linked questions (problem_set_questions)
  const { data: linkedQuestions } = await supabase
    .from("problem_set_questions")
    .select("question_id, section_number, section_title, position, points_override")
    .eq("problem_set_id", problemSetId);

  if (linkedQuestions && linkedQuestions.length > 0) {
    const junctionRows = linkedQuestions.map((lq) => ({
      problem_set_id: copy.id,
      question_id: lq.question_id,
      section_number: lq.section_number,
      section_title: lq.section_title,
      position: lq.position,
      points_override: lq.points_override,
    }));

    const { error: junctionError } = await supabase
      .from("problem_set_questions")
      .insert(junctionRows);

    if (junctionError) {
      // Clean up the copy if junction insert fails
      await supabase.from("problem_sets").delete().eq("id", copy.id);
      return { error: "問題の関連付けに失敗しました" };
    }
  }

  revalidatePath("/seller");
  return { success: true, newId: copy.id };
}
