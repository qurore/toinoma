import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompleteSeller } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { RubricEditor } from "@/components/seller/rubric-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { problemSetRubricSchema, type ProblemSetRubric } from "@toinoma/shared/schemas";

export default async function RubricEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireCompleteSeller();
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
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/sell/${id}/edit`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            編集に戻る
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          ルーブリック編集
        </h1>
        <p className="mt-1 text-muted-foreground">{ps.title}</p>
      </div>

      <RubricEditor problemSetId={id} initialRubric={rubric} />
    </main>
  );
}
