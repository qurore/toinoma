"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearRecentlyViewed } from "@/lib/recently-viewed";

export async function clearRecentlyViewedAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await clearRecentlyViewed(user.id);
}
