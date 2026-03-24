"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createBulkNotifications } from "@/lib/notifications";

interface SendAnnouncementInput {
  problemSetId: string;
  title: string;
  body: string;
}

export async function sendAnnouncementToPurchasers({
  problemSetId,
  title,
  body,
}: SendAnnouncementInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  if (!trimmedTitle || trimmedTitle.length < 3) {
    return { error: "タイトルは3文字以上で入力してください" };
  }
  if (trimmedTitle.length > 200) {
    return { error: "タイトルは200文字以内で入力してください" };
  }
  if (!trimmedBody || trimmedBody.length < 10) {
    return { error: "本文は10文字以上で入力してください" };
  }
  if (trimmedBody.length > 2000) {
    return { error: "本文は2000文字以内で入力してください" };
  }

  // Verify ownership of the problem set
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, seller_id, title")
    .eq("id", problemSetId)
    .eq("seller_id", user.id)
    .single();

  if (!ps) {
    return { error: "問題セットが見つかりません" };
  }

  // Fetch all purchasers of this problem set
  const { data: purchases } = await supabase
    .from("purchases")
    .select("user_id")
    .eq("problem_set_id", problemSetId);

  if (!purchases || purchases.length === 0) {
    return { error: "この問題セットの購入者がいません" };
  }

  // Deduplicate user IDs (should be unique via DB constraint, but be safe)
  const purchaserIds = [...new Set(purchases.map((p) => p.user_id))];

  // Remove seller from recipients (don't notify yourself)
  const recipientIds = purchaserIds.filter((id) => id !== user.id);

  if (recipientIds.length === 0) {
    return { error: "送信対象の購入者がいません" };
  }

  // Create bulk notifications
  await createBulkNotifications(
    recipientIds,
    "announcement",
    trimmedTitle,
    `「${ps.title}」の出品者からのお知らせ: ${trimmedBody}`,
    `/problem/${problemSetId}`
  );

  revalidatePath(`/sell/${problemSetId}/announce`);
  return { success: true, recipientCount: recipientIds.length };
}
