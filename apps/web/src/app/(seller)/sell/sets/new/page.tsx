import { requireSellerTos } from "@/lib/auth/require-seller";
import { SetComposer } from "@/components/seller/set-composer";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "問題セットを作成 - 問の間",
  description: "問題プールから問題を選んで、新しい問題セットを作成します",
};

export default async function CreateProblemSetFromPoolPage() {
  const { user } = await requireSellerTos();

  return (
    <div className="container mx-auto flex h-[calc(100vh-3.5rem)] flex-col px-4 py-6">
      <div className="shrink-0">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "出品者ダッシュボード", href: "/sell" },
            { label: "問題セット", href: "/sell/sets" },
            { label: "新規作成" },
          ]}
        />
      </div>

      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">
          問題セットを作成
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          問題プールから問題を選び、セクションにまとめて問題セットを作成します
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <SetComposer sellerId={user.id} />
      </div>
    </div>
  );
}
