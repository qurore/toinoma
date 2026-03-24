import Link from "next/link";
import { Library, Plus } from "lucide-react";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ProblemSetList } from "../problem-set-list";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "問題セット - 問の間",
};

const STATUS_TABS = [
  { value: "", label: "すべて" },
  { value: "published", label: "公開中" },
  { value: "draft", label: "下書き" },
] as const;

export default async function ProblemSetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { user } = await requireSellerTos();
  const supabase = await createClient();
  const params = await searchParams;
  const statusFilter = params.status ?? "";

  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, status, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const allSets = problemSets ?? [];
  const publishedCount = allSets.filter((s) => s.status === "published").length;
  const draftCount = allSets.filter((s) => s.status === "draft").length;

  // Apply status filter
  const filteredSets = statusFilter
    ? allSets.filter((s) => s.status === statusFilter)
    : allSets;

  // Count map for tab badges
  const countMap: Record<string, number> = {
    "": allSets.length,
    published: publishedCount,
    draft: draftCount,
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "出品者ダッシュボード", href: "/sell" },
          { label: "問題セット" },
        ]}
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">問題セット</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allSets.length > 0
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

      {/* Status filter tabs */}
      {allSets.length > 0 && (
        <div className="mb-6 flex items-center gap-1 border-b border-border">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            const href = tab.value
              ? `/sell/sets?status=${tab.value}`
              : "/sell/sets";
            return (
              <Link
                key={tab.value}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {countMap[tab.value]}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {allSets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Library className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              まだ問題セットがありません
            </h2>
            <p className="mb-8 max-w-sm text-sm text-muted-foreground">
              問題プールから問題を選んでセットを作成しましょう。
            </p>
            <div className="flex gap-3">
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
          </CardContent>
        </Card>
      ) : filteredSets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Library className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              {statusFilter === "published"
                ? "公開中の問題セットはありません"
                : "下書きの問題セットはありません"}
            </h2>
            <p className="mb-8 max-w-sm text-sm text-muted-foreground">
              {statusFilter === "published"
                ? "下書きから問題セットを公開するか、新しいセットを作成しましょう。"
                : "すべての問題セットが公開済みです。"}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/sell/sets">すべて表示</Link>
              </Button>
              <Button asChild>
                <Link href="/sell/sets/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  新規作成
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ProblemSetList sets={filteredSets} />
      )}
    </main>
  );
}
