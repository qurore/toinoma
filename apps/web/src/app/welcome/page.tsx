import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WelcomeWizard } from "@/components/onboarding/welcome-wizard";
import type { Subject } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ようこそ - 問の間",
  description: "Toinomaへようこそ。プロフィールを設定して学習を始めましょう。",
};

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth guard — redirect to login if not authenticated
  if (!user) redirect("/login");

  // Check if already onboarded (preferred_subjects is non-empty)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, preferred_subjects, study_goal")
    .eq("id", user.id)
    .single();

  const hasCompletedOnboarding =
    profile &&
    profile.preferred_subjects &&
    profile.preferred_subjects.length > 0;

  // Already onboarded — redirect to dashboard
  if (hasCompletedOnboarding) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Brand header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          問の間
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Where questions meet answers.
        </p>
      </div>

      <WelcomeWizard
        initialDisplayName={profile?.display_name ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? null}
        initialSubjects={(profile?.preferred_subjects ?? []) as Subject[]}
      />
    </main>
  );
}
