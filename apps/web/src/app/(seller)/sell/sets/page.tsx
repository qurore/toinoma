import Link from "next/link";
import { Library, Plus } from "lucide-react";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ProblemSetList } from "../problem-set-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "問題セット - 問の間",
};

export default async function ProblemSetsPage() {
  const { user } = await requireSellerTos();
  const supabase = await createClient();

  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, status, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const sets = problemSets ?? [];
  const publishedCount = sets.filter((s) => s.status === "published").length;
  const draftCount = sets.filter((s) => s.status === "draft").length;

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "出品者ダッシュボード", href: "/sell" },
          { label: "問題セット" },
        ]}
      />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">問題セット</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sets.length > 0
              ? `${publishedCount}件 公開中 / ${draftCount}件 下書き`
              : "問題セットはまだありません"}
          </p>
        </div>
        <Button asChild>
          <Link href="/sell/sets/new">
            <Plus className="mr-1.5 h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      {sets.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Library className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold">
            まだ問題セットがありません
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            問題プールから問題を選んでセットを作成しましょう。
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/sell/pool">問題プールを見る</Link>
            </Button>
            <Button asChild>
              <Link href="/sell/sets/new">
                <Plus className="mr-1.5 h-4 w-4" />
                新規作成
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ProblemSetList sets={sets} />
      )}
    </main>
  );
}
