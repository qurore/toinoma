import { requireSellerTos } from "@/lib/auth/require-seller";
import { createProblemSet } from "@/app/(seller)/sell/actions";
import { ProblemSetForm } from "@/components/seller/problem-set-form";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "新規問題セット作成 - 問の間",
};

export default async function CreateProblemSetPage() {
  await requireSellerTos();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "出品者ダッシュボード", href: "/sell" },
          { label: "問題セット", href: "/sell/sets" },
          { label: "新規作成" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          新規問題セット作成
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          問題セットの基本情報を入力してください
        </p>
      </div>

      <ProblemSetForm
        onSubmit={createProblemSet}
        submitLabel="作成して編集へ"
      />
    </div>
  );
}
