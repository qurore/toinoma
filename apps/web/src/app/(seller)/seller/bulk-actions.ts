"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ──────────────────────────────────────────────
// SLR-022: Bulk problem set actions
// ──────────────────────────────────────────────

/**
 * Bulk delete problem sets. Ownership is verified for each set.
 * Only sets owned by the authenticated seller are deleted.
 */
export async function bulkDeleteProblemSets(
  ids: string[]
): Promise<{ success?: boolean; error?: string; deletedCount?: number }> {
  if (ids.length === 0) return { error: "削除する問題セットを選択してください" };
  if (ids.length > 50) return { error: "一度に削除できるのは50件までです" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // Verify ownership: only delete sets belonging to the current user
  const { data: ownedSets } = await supabase
    .from("problem_sets")
    .select("id")
    .in("id", ids)
    .eq("seller_id", user.id);

  const ownedIds = (ownedSets ?? []).map((s) => s.id);

  if (ownedIds.length === 0) {
    return { error: "削除可能な問題セットがありません" };
  }

  const { error } = await supabase
    .from("problem_sets")
    .delete()
    .in("id", ownedIds);

  if (error) return { error: "問題セットの削除に失敗しました" };

  revalidatePath("/seller");
  return { success: true, deletedCount: ownedIds.length };
}

/**
 * Bulk unpublish problem sets (set status to 'draft').
 * Ownership is verified for each set.
 */
export async function bulkUnpublishProblemSets(
  ids: string[]
): Promise<{ success?: boolean; error?: string; updatedCount?: number }> {
  if (ids.length === 0) return { error: "非公開にする問題セットを選択してください" };
  if (ids.length > 50) return { error: "一度に変更できるのは50件までです" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // Verify ownership: only update sets belonging to the current user
  const { data: ownedSets } = await supabase
    .from("problem_sets")
    .select("id")
    .in("id", ids)
    .eq("seller_id", user.id)
    .eq("status", "published");

  const ownedIds = (ownedSets ?? []).map((s) => s.id);

  if (ownedIds.length === 0) {
    return { error: "非公開にできる問題セットがありません" };
  }

  const { error } = await supabase
    .from("problem_sets")
    .update({ status: "draft" })
    .in("id", ownedIds);

  if (error) return { error: "ステータスの変更に失敗しました" };

  revalidatePath("/seller");
  return { success: true, updatedCount: ownedIds.length };
}
