import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type SellerProfile = Database["public"]["Tables"]["seller_profiles"]["Row"];

export async function requireCompleteSeller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("id", user.id)
    .single<SellerProfile>();

  if (!sellerProfile?.tos_accepted_at || !sellerProfile?.stripe_account_id) {
    redirect("/sell/onboarding");
  }

  return { user, sellerProfile };
}
