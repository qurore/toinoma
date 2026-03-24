import Link from "next/link";
import { Plus } from "lucide-react";
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "出品者ダッシュボード", href: "/sell" },
          { label: "問題セット" },
        ]}
      />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">問題セット</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sets.length}件の問題セット
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
          <p className="text-lg font-semibold">
            まだ問題セットがありません
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            問題プールから問題を選んでセットを作成しましょう。
          </p>
          <Button asChild className="mt-4">
            <Link href="/sell/sets/new">
              <Plus className="mr-1.5 h-4 w-4" />
              新規作成
            </Link>
          </Button>
        </div>
      ) : (
        <ProblemSetList sets={sets} />
      )}
    </main>
  );
}
