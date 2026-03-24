"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/types/database";
import { SUBJECTS } from "@toinoma/shared/constants";

const VALID_STUDY_GOALS = [
  "common_test",
  "national_secondary",
  "private_general",
  "entrance_exam",
  "daily_study",
  "certification",
  "review",
  "other",
] as const;

export async function saveOnboardingProfile(input: {
  displayName: string;
  subjects: string[];
  studyGoal: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Validate display name
  const trimmedName = input.displayName.trim();
  if (trimmedName.length > 50) {
    return { error: "表示名は50文字以内で入力してください" };
  }

  // Validate subjects — filter to valid values
  const validSubjects = input.subjects.filter((s) =>
    (SUBJECTS as readonly string[]).includes(s)
  ) as Subject[];

  // Validate study goal
  const studyGoal = (VALID_STUDY_GOALS as readonly string[]).includes(
    input.studyGoal
  )
    ? input.studyGoal
    : null;

  // Build update payload — only include non-empty fields
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (trimmedName) {
    update.display_name = trimmedName;
  }

  if (validSubjects.length > 0) {
    update.preferred_subjects = validSubjects;
  }

  if (studyGoal) {
    update.study_goal = studyGoal;
  }

  // Only persist if there is something to save
  if (Object.keys(update).length <= 1) {
    // Only updated_at — nothing meaningful to save
    return { success: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return { error: "プロフィールの保存に失敗しました" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/welcome");
  return { success: true };
}
