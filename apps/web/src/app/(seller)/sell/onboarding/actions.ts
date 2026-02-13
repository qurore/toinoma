"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sellerProfileSchema } from "@toinoma/shared/schemas";
import {
  createConnectAccount,
  createConnectAccountLink,
} from "@/lib/stripe";

export async function acceptTos() {
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

  redirect("/sell/onboarding?step=2");
}

export async function saveSellerProfile(formData: FormData) {
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
    return { error: "プロフィールの保存に失敗しました" };
  }

  redirect("/sell/onboarding?step=3");
}

export async function initStripeConnect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Check if account already exists
  const { data: profile } = await supabase
    .from("seller_profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  let accountId = profile?.stripe_account_id;

  if (!accountId) {
    const account = await createConnectAccount(user.email!);
    accountId = account.id;

    await supabase
      .from("seller_profiles")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);
  }

  const accountLink = await createConnectAccountLink({
    accountId,
    refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sell/onboarding?step=3&stripe_refresh=true`,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sell/onboarding?step=3&stripe_return=true`,
  });

  redirect(accountLink.url);
}
