import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompleteSeller } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { updateProblemSet } from "@/app/(seller)/sell/actions";
import { ProblemSetForm } from "@/components/seller/problem-set-form";
import { PdfUploader } from "@/components/seller/pdf-uploader";
import { PublishControls } from "@/components/seller/publish-controls";
import { PdfPreview } from "@/components/seller/pdf-preview";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Database, Subject, Difficulty } from "@/types/database";

type ProblemSetRow = Database["public"]["Tables"]["problem_sets"]["Row"];

export default async function EditProblemSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireCompleteSeller();
  const supabase = await createClient();

  const { data: ps } = await supabase
    .from("problem_sets")
    .select("*")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single<ProblemSetRow>();

  if (!ps) notFound();

  const updateAction = updateProblemSet.bind(null, id);

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sell">
            <ArrowLeft className="mr-1 h-4 w-4" />
            戻る
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/sell/${id}/rubric`}>ルーブリック編集</Link>
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        問題セット編集
      </h1>

      <div className="space-y-6">
        <ProblemSetForm
          initialData={{
            title: ps.title,
            description: ps.description,
            subject: ps.subject as Subject,
            university: ps.university,
            difficulty: ps.difficulty as Difficulty,
            price: ps.price,
          }}
          onSubmit={updateAction}
          submitLabel="保存"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <PdfUploader
            problemSetId={id}
            sellerId={user.id}
            type="problem"
            currentUrl={ps.problem_pdf_url}
          />
          <PdfUploader
            problemSetId={id}
            sellerId={user.id}
            type="solution"
            currentUrl={ps.solution_pdf_url}
          />
        </div>

        <PdfPreview
          title={ps.title}
          problemSetId={id}
          problemPdfUrl={ps.problem_pdf_url}
        />

        <PublishControls
          problemSetId={id}
          currentStatus={ps.status}
        />
      </div>
    </main>
  );
}
