"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { problemSetRubricSchema } from "@toinoma/shared/schemas";
import type { Database } from "@/types/database";

type ProblemSetInsert = Database["public"]["Tables"]["problem_sets"]["Insert"];
type Subject = Database["public"]["Enums"]["subject"];
type Difficulty = Database["public"]["Enums"]["difficulty"];

export async function createProblemSet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const subject = formData.get("subject") as Subject;
  const university = formData.get("university") as string;
  const difficulty = formData.get("difficulty") as Difficulty;
  const price = parseInt(formData.get("price") as string, 10);

  if (!title || !subject || !difficulty) {
    return { error: "必須項目を入力してください" };
  }

  const insert: ProblemSetInsert = {
    seller_id: user.id,
    title,
    description: description || null,
    subject,
    university: university || null,
    difficulty,
    price: isNaN(price) ? 0 : price,
    status: "draft",
  };

  const { data, error } = await supabase
    .from("problem_sets")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    return { error: "問題セットの作成に失敗しました" };
  }

  redirect(`/sell/${data.id}/edit`);
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

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const subject = formData.get("subject") as Subject;
  const university = formData.get("university") as string;
  const difficulty = formData.get("difficulty") as Difficulty;
  const price = parseInt(formData.get("price") as string, 10);

  if (!title || !subject || !difficulty) {
    return { error: "必須項目を入力してください" };
  }

  const { error } = await supabase
    .from("problem_sets")
    .update({
      title,
      description: description || null,
      subject,
      university: university || null,
      difficulty,
      price: isNaN(price) ? 0 : price,
    })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "問題セットの更新に失敗しました" };
  }

  revalidatePath(`/sell/${problemSetId}/edit`);
  return { success: true };
}

export async function saveRubric(problemSetId: string, rubricJson: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

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

  revalidatePath(`/sell/${problemSetId}/rubric`);
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

  // Verify the problem set has a rubric
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("rubric, problem_pdf_url")
    .eq("id", problemSetId)
    .eq("seller_id", user.id)
    .single();

  if (!ps) return { error: "問題セットが見つかりません" };
  if (!ps.rubric) return { error: "ルーブリックを設定してください" };
  if (!ps.problem_pdf_url)
    return { error: "問題PDFをアップロードしてください" };

  const rubricResult = problemSetRubricSchema.safeParse(ps.rubric);
  if (!rubricResult.success) {
    return { error: "ルーブリックが有効な形式ではありません" };
  }

  const { error } = await supabase
    .from("problem_sets")
    .update({ status: "published" })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) return { error: "公開に失敗しました" };

  revalidatePath("/sell");
  revalidatePath("/explore");
  return { success: true };
}

export async function unpublishProblemSet(problemSetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("problem_sets")
    .update({ status: "draft" })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) return { error: "非公開への変更に失敗しました" };

  revalidatePath("/sell");
  return { success: true };
}

export async function deleteProblemSet(problemSetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

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

  revalidatePath("/sell");
  redirect("/sell");
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

  const field =
    type === "problem" ? "problem_pdf_url" : "solution_pdf_url";

  const { error } = await supabase
    .from("problem_sets")
    .update({ [field]: url })
    .eq("id", problemSetId)
    .eq("seller_id", user.id);

  if (error) return { error: "PDF URLの保存に失敗しました" };

  revalidatePath(`/sell/${problemSetId}/edit`);
  return { success: true };
}
