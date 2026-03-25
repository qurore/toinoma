import { notFound } from "next/navigation";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { RubricEditor } from "@/components/seller/rubric-editor";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { problemSetRubricSchema, type ProblemSetRubric } from "@toinoma/shared/schemas";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ルーブリック編集 - 問の間",
};

export default async function RubricEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireSellerTos();
  const supabase = await createClient();

  const { data: ps } = await supabase
    .from("problem_sets")
    .select("title, rubric")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single();

  if (!ps) notFound();

  // Parse existing rubric if valid, otherwise null
  let rubric: ProblemSetRubric | null = null;
  if (ps.rubric) {
    const result = problemSetRubricSchema.safeParse(ps.rubric);
    if (result.success) {
      rubric = result.data;
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "出品者ダッシュボード", href: "/seller" },
          { label: ps.title, href: `/seller/sets/${id}/edit` },
          { label: "ルーブリック編集" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          ルーブリック編集
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{ps.title}</p>
      </div>

      <RubricEditor problemSetId={id} initialRubric={rubric} />
    </div>
  );
}
