import Link from "next/link";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { Button } from "@/components/ui/button";
import { PdfImportWizard } from "@/components/seller/pdf-import-wizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDFインポート - 問の間",
  description: "PDFからAIを使って問題を自動抽出し、問題プールに追加します",
};

export default async function PdfImportPage() {
  // Auth + seller ToS guard
  await requireSellerTos();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/seller/pool">
            &larr; 問題プール
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          PDFから問題をインポート
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          PDFをアップロードすると、AIが自動的に問題を抽出します。抽出結果を確認・編集してからプールに追加できます。
        </p>
      </div>

      <PdfImportWizard />
    </div>
  );
}
