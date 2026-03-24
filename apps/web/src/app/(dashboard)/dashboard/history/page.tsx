import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { SubmissionHistoryClient } from "./history-client";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "解答履歴 | 問の間",
};

export default async function SubmissionHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all submissions with problem set data
  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, problem_set_id, score, max_score, created_at, problem_sets(title, subject, difficulty)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (submissions ?? []).map((s) => {
    const ps = s.problem_sets as unknown as {
      title: string;
      subject: string;
      difficulty: string;
    } | null;

    return {
      id: s.id,
      problemSetId: s.problem_set_id,
      title: ps?.title ?? "Unknown",
      subject: (ps?.subject ?? null) as Subject | null,
      subjectLabel: ps?.subject
        ? SUBJECT_LABELS[ps.subject as Subject] ?? ps.subject
        : null,
      score: s.score,
      maxScore: s.max_score,
      percentage:
        s.max_score && s.max_score > 0
          ? Math.round(((s.score ?? 0) / s.max_score) * 100)
          : null,
      createdAt: s.created_at,
    };
  });

  // Derive available subjects for filter options
  const subjectOptions = Array.from(
    new Set(items.filter((i) => i.subject).map((i) => i.subject!))
  ).map((s) => ({
    value: s,
    label: SUBJECT_LABELS[s] ?? s,
  }));

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "マイページ", href: "/dashboard" },
          { label: "解答履歴", href: "/dashboard/history" },
        ]}
      />
      <SubmissionHistoryClient
        items={items}
        subjectOptions={subjectOptions}
      />
    </main>
  );
}
