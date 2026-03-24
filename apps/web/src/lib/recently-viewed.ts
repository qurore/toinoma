"use server";

import { createClient } from "@/lib/supabase/server";

// Track a problem set view — upserts into recently_viewed
export async function trackView(
  userId: string,
  problemSetId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("recently_viewed")
    .upsert(
      {
        user_id: userId,
        problem_set_id: problemSetId,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,problem_set_id" }
    );
}

export interface RecentlyViewedItem {
  id: string;
  problem_set_id: string;
  viewed_at: string;
  problem_set: {
    id: string;
    title: string;
    subject: string;
    difficulty: string;
    price: number;
    cover_image_url: string | null;
    university: string | null;
  } | null;
}

// Clear all recently viewed records for a user
export async function clearRecentlyViewed(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("recently_viewed")
    .delete()
    .eq("user_id", userId);
}

export async function getRecentlyViewed(
  userId: string,
  limit: number = 20
): Promise<RecentlyViewedItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("recently_viewed")
    .select(
      "id, problem_set_id, viewed_at, problem_sets(id, title, subject, difficulty, price, cover_image_url, university)"
    )
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    problem_set_id: row.problem_set_id as string,
    viewed_at: row.viewed_at as string,
    problem_set: row.problem_sets as RecentlyViewedItem["problem_set"],
  }));
}
