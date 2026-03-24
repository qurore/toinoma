"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sellerProfileSchema } from "@toinoma/shared/schemas";

/**
 * Update seller profile fields (display name, description, university, circle name).
 */
export async function updateSellerProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const raw = {
    sellerDisplayName: formData.get("sellerDisplayName") as string,
    sellerDescription: formData.get("sellerDescription") as string,
    university: formData.get("university") as string,
    circleName: formData.get("circleName") as string,
  };

  const result = sellerProfileSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { error } = await supabase
    .from("seller_profiles")
    .update({
      seller_display_name: result.data.sellerDisplayName,
      seller_description: result.data.sellerDescription || null,
      university: result.data.university || null,
      circle_name: result.data.circleName || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "プロフィールの更新に失敗しました" };
  }

  revalidatePath("/sell/settings");
  revalidatePath("/sell");
  return { success: true };
}
