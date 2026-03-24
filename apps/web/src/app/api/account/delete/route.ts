import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/**
 * DELETE /api/account/delete
 *
 * APPI-compliant account deletion with full cascade:
 * 1. Cancel active Stripe subscriptions
 * 2. Anonymize profile data
 * 3. Delete user-generated content (reviews, Q&A, favorites, collections, notifications)
 * 4. Preserve purchases/submissions for seller analytics (anonymized)
 * 5. Delete Supabase auth user
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const userId = user.id;

  try {
    // Step 1: Cancel active Stripe subscription if exists
    const { data: sub } = await adminClient
      .from("user_subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (sub?.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch (stripeErr) {
        console.error("[account/delete] Stripe cancellation error:", stripeErr);
        // Continue with deletion even if Stripe cancel fails
      }
    }

    // Step 2: Delete user-generated content that should not persist
    await Promise.all([
      adminClient.from("favorites").delete().eq("user_id", userId),
      adminClient.from("collection_items").delete().in(
        "collection_id",
        (await adminClient.from("collections").select("id").eq("user_id", userId)).data?.map(c => c.id) ?? []
      ),
      adminClient.from("notifications").delete().eq("user_id", userId),
      adminClient.from("notification_preferences").delete().eq("user_id", userId),
      adminClient.from("review_votes").delete().eq("user_id", userId),
      adminClient.from("qa_upvotes").delete().eq("user_id", userId),
      adminClient.from("bookmarks").delete().eq("user_id", userId),
      adminClient.from("user_notes").delete().eq("user_id", userId),
      adminClient.from("recently_viewed").delete().eq("user_id", userId),
    ]);

    // Delete collections after items are removed
    await adminClient.from("collections").delete().eq("user_id", userId);

    // Step 3: Anonymize reviews (preserve for seller analytics but remove PII)
    await adminClient
      .from("reviews")
      .update({ body: "（退会済みユーザーのレビュー）" })
      .eq("user_id", userId);

    // Step 4: Anonymize Q&A contributions
    await Promise.all([
      adminClient
        .from("qa_questions")
        .update({ body: "（退会済みユーザーの質問）", title: "（削除済み）" })
        .eq("user_id", userId),
      adminClient
        .from("qa_answers")
        .update({ body: "（退会済みユーザーの回答）" })
        .eq("user_id", userId),
    ]);

    // Step 5: Delete subscription record and token usage
    await Promise.all([
      adminClient.from("token_usage").delete().eq("user_id", userId),
      adminClient.from("user_subscriptions").delete().eq("user_id", userId),
    ]);

    // Step 6: Anonymize profile (keep record for FK integrity)
    await adminClient
      .from("profiles")
      .update({
        display_name: "退会済みユーザー",
        avatar_url: null,
        preferred_subjects: [],
        study_goal: null,
      })
      .eq("id", userId);

    // Step 7: Delete the auth user (this cascades to profiles via trigger)
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      console.error("[account/delete] Auth deletion error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[account/delete] Cascade deletion error:", err);
    return NextResponse.json(
      { error: "アカウントの削除中にエラーが発生しました。サポートにお問い合わせください。" },
      { status: 500 }
    );
  }
}
