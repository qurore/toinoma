import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WelcomeWizard } from "@/components/onboarding/welcome-wizard";
import type { Subject } from "@/types/database";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ようこそ - 問の間",
  description:
    "Toinomaへようこそ。プロフィールを設定して学習を始めましょう。",
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
      <div className="w-full max-w-lg">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-bold text-foreground">
                問の間
              </span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                TOINOMA
              </span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            ようこそ、Toinomaへ
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            あなたに最適な学習体験をお届けするために、簡単なセットアップを行いましょう
          </p>
        </div>

        {/* Wizard card */}
        <WelcomeWizard
          initialDisplayName={profile?.display_name ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? null}
          initialSubjects={(profile?.preferred_subjects ?? []) as Subject[]}
        />
      </div>
    </main>
  );
}
