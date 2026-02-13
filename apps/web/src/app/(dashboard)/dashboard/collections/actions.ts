"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCollection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name) {
    return { error: "コレクション名を入力してください" };
  }

  if (name.length > 100) {
    return { error: "コレクション名は100文字以内にしてください" };
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: user.id, name, description })
    .select("id")
    .single();

  if (error) {
    return { error: "コレクションの作成に失敗しました" };
  }

  redirect(`/dashboard/collections/${data.id}`);
}

export async function updateCollection(
  collectionId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name) {
    return { error: "コレクション名を入力してください" };
  }

  const { error } = await supabase
    .from("collections")
    .update({ name, description })
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "コレクションの更新に失敗しました" };
  }

  revalidatePath(`/dashboard/collections/${collectionId}`);
  return { success: true };
}

export async function deleteCollection(collectionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "コレクションの削除に失敗しました" };
  }

  revalidatePath("/dashboard/collections");
  redirect("/dashboard/collections");
}

export async function addToCollection(
  collectionId: string,
  problemSetId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Get the next position
  const { count } = await supabase
    .from("collection_items")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", collectionId);

  const { error } = await supabase.from("collection_items").insert({
    collection_id: collectionId,
    problem_set_id: problemSetId,
    position: (count ?? 0),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "この問題セットは既にコレクションに追加されています" };
    }
    return { error: "問題セットの追加に失敗しました" };
  }

  revalidatePath(`/dashboard/collections/${collectionId}`);
  return { success: true };
}

export async function removeFromCollection(
  collectionId: string,
  problemSetId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("problem_set_id", problemSetId);

  if (error) {
    return { error: "問題セットの削除に失敗しました" };
  }

  revalidatePath(`/dashboard/collections/${collectionId}`);
  return { success: true };
}
