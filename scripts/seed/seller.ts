import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@toinoma/shared/types";
import { asRawClient } from "./env";
import { log } from "./logger";

export interface TestSellerSpec {
  email: string;
  password: string;
  displayName: string;
  sellerDisplayName: string;
  sellerDescription: string;
  university: string;
  circleName: string;
  stripeAccountStub: string;
}

export const TEST_SELLER: TestSellerSpec = {
  email: "seed-utokyo@toinoma.test",
  password: "SeedUtokyo2026!",
  displayName: "東大2026 過去問アーカイブ運営",
  sellerDisplayName: "東大2026 過去問アーカイブ",
  sellerDescription:
    "東京大学 2026年度 前期日程の過去問・解答例・出題分析を収録した動作確認用シードデータです。" +
    "本アーカイブは Toinoma の機能検証を目的として整備されており、実際の販売・購入は想定していません。" +
    "問題および解答例の著作権は各出題機関に帰属します。",
  university: "東京大学",
  circleName: "過去問研究会",
  stripeAccountStub: "acct_seed_utokyo_2026_test",
};

export interface EnsureSellerResult {
  sellerUserId: string;
  created: boolean;
}

export async function ensureTestSeller(
  supabase: SupabaseClient<Database>,
  spec: TestSellerSpec
): Promise<EnsureSellerResult> {
  const existingId = await findUserIdByEmail(supabase, spec.email);
  let sellerUserId: string;
  let created = false;

  if (existingId) {
    sellerUserId = existingId;
    log({ phase: "seller" }, `auth.users EXISTS: ${spec.email} (uid=${existingId})`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
      user_metadata: {
        full_name: spec.displayName,
      },
    });
    if (error || !data.user) {
      throw new Error(`Failed to create auth user: ${error?.message ?? "unknown"}`);
    }
    sellerUserId = data.user.id;
    created = true;
    log({ phase: "seller" }, `auth.users CREATED: ${spec.email} (uid=${sellerUserId})`);
  }

  // Try to wait for the trigger; if it never fires (trigger not installed), force-upsert.
  const triggerFired = await waitForProfileSoft(supabase, sellerUserId);
  if (!triggerFired) {
    log({ phase: "seller" }, "handle_new_user trigger did not fire — forcing profile upsert");
    await ensureProfileFromAdmin(supabase, sellerUserId, spec.displayName);
  } else {
    await upsertProfileDisplayName(supabase, sellerUserId, spec.displayName);
  }
  await upsertSellerProfile(supabase, sellerUserId, spec);
  await ensureNotificationPreferences(supabase, sellerUserId);

  return { sellerUserId, created };
}

async function findUserIdByEmail(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    if (!data.users || data.users.length === 0) return null;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < perPage) return null;
    page += 1;
    if (page > 50) return null;
  }
}

async function waitForProfileSoft(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (data) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function upsertProfileDisplayName(
  supabase: SupabaseClient<Database>,
  userId: string,
  displayName: string
): Promise<void> {
  const { error } = await asRawClient(supabase)
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", userId);
  if (error) throw new Error(`profiles update failed: ${error.message}`);
}

async function upsertSellerProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  spec: TestSellerSpec
): Promise<void> {
  const { error } = await asRawClient(supabase)
    .from("seller_profiles")
    .upsert(
      {
        id: userId,
        seller_display_name: spec.sellerDisplayName,
        seller_description: spec.sellerDescription,
        university: spec.university,
        circle_name: spec.circleName,
        tos_accepted_at: new Date().toISOString(),
        stripe_account_id: spec.stripeAccountStub,
      },
      { onConflict: "id" }
    );
  if (error) throw new Error(`seller_profiles upsert failed: ${error.message}`);
  log({ phase: "seller" }, `seller_profiles UPSERT OK`);
}

async function ensureNotificationPreferences(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { error } = await asRawClient(supabase)
    .from("notification_preferences")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) {
    log(
      { phase: "seller" },
      `notification_preferences upsert SKIP: ${error.message}`
    );
    return;
  }
  log({ phase: "seller" }, `notification_preferences ensured`);
}

export async function ensureProfileFromAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
  displayName: string
): Promise<void> {
  const { error } = await asRawClient(supabase)
    .from("profiles")
    .upsert({ id: userId, display_name: displayName }, { onConflict: "id" });
  if (error) throw new Error(`profiles upsert failed: ${error.message}`);
}

export async function resetTestSellerSubtree(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  log({ phase: "reset" }, `deleting DB rows for ${userId}...`);
  const raw = asRawClient(supabase);

  const setListResp = (await (supabase
    .from("problem_sets")
    .select("id")
    .eq("seller_id", userId) as unknown as Promise<{
    data: { id: string }[] | null;
    error: { message: string } | null;
  }>));
  const setIds = setListResp.data ?? [];

  if (setIds.length > 0) {
    await raw
      .from("problem_set_questions")
      .delete()
      .in("problem_set_id", setIds.map((r) => r.id));
  }
  await raw.from("problem_sets").delete().eq("seller_id", userId);
  await raw.from("questions").delete().eq("seller_id", userId);
  log({ phase: "reset" }, `DB rows deleted (${setIds.length} sets removed)`);
}

export async function deleteSeedSellerAuth(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  // Cascades to profiles, seller_profiles, notification_preferences via FK.
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    log({ phase: "reset" }, `auth delete non-fatal: ${error.message}`);
    return;
  }
  log({ phase: "reset" }, `auth.users deleted (uid=${userId})`);
}
