import Link from "next/link";
import { requireCompleteSeller } from "@/lib/auth/require-seller";
import { createProblemSet } from "@/app/(seller)/sell/actions";
import { ProblemSetForm } from "@/components/seller/problem-set-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function CreateProblemSetPage() {
  await requireCompleteSeller();

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sell">
            <ArrowLeft className="mr-1 h-4 w-4" />
            戻る
          </Link>
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        新規問題セット作成
      </h1>

      <ProblemSetForm
        onSubmit={createProblemSet}
        submitLabel="作成して編集へ"
      />
    </main>
  );
}
