import Link from "next/link";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { SUBJECT_LABELS, DIFFICULTY_LABELS, ANSWER_TYPE_LABELS } from "@toinoma/shared/constants";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { PoolFilterBar } from "@/components/seller/pool-filter-bar";
import type { Subject, Difficulty, AnswerType } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "問題プール - 問の間",
};

const TYPE_LABELS: Record<string, string> = {
  essay: "記述式",
  mark_sheet: "マーク式",
  fill_in_blank: "穴埋め式",
  multiple_choice: "選択式",
};

export default async function ProblemPoolPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { user } = await requireSellerTos();
  const params = await searchParams;

  // Extract filter parameters from URL search params
  const subjectFilter = params.subject ?? "";
  const typeFilter = params.type ?? "";
  const q = params.q ?? "";

  const supabase = await createClient();

  // Build filtered query
  let query = supabase
    .from("questions")
    .select(
      "id, question_type, question_text, subject, difficulty, points, topic_tags, vertical_text, created_at"
    )
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (subjectFilter) query = query.eq("subject", subjectFilter as Subject);
  if (typeFilter) query = query.eq("question_type", typeFilter as AnswerType);
  if (q) query = query.ilike("question_text", `%${q}%`);

  const { data: questions } = await query.limit(100);

  // Get total count (unfiltered) for the header stat
  const { count: totalCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", user.id);

  const allQuestions = (questions ?? []) as Array<{
    id: string;
    question_type: string;
    question_text: string;
    subject: string;
    difficulty: string;
    points: number;
    topic_tags: string[] | null;
    vertical_text: boolean;
    created_at: string;
  }>;

  const hasActiveFilters = !!subjectFilter || !!typeFilter || !!q;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "出品者ダッシュボード", href: "/seller" },
        { label: "問題プール" },
      ]} />
      {/* Header with title and actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">問題プール</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount ?? 0}件の問題をストック中
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/seller/pool/import">
              <Upload className="mr-1.5 h-4 w-4" />
              PDFインポート
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/seller/pool/new">
              <Plus className="mr-1.5 h-4 w-4" />
              問題を作成
            </Link>
          </Button>
        </div>
      </div>

      {/* Type-level stats as cards */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {Object.entries(TYPE_LABELS).map(([type, label]) => {
          const count = allQuestions.filter(
            (item) => item.question_type === type
          ).length;
          return (
            <div
              key={type}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap gap-3 py-4">
          <PoolFilterBar
            defaultSubject={subjectFilter}
            defaultType={typeFilter}
            defaultQuery={q}
            hasActiveFilters={hasActiveFilters}
          />
        </CardContent>
      </Card>

      {/* Question list or empty state */}
      {allQuestions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <h2 className="mb-2 text-lg font-semibold">
              {hasActiveFilters
                ? "条件に一致する問題がありません"
                : "まだ問題がありません"}
            </h2>
            <p className="mb-8 max-w-sm text-sm text-muted-foreground">
              {hasActiveFilters
                ? "フィルターや検索条件を変更してお試しください"
                : "問題プールに問題を追加して、問題セットの作成を始めましょう"}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" asChild>
                <Link href="/seller/pool">
                  <Search className="mr-1.5 h-4 w-4" />
                  フィルターをクリア
                </Link>
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href="/seller/pool/import">
                    <Upload className="mr-1.5 h-4 w-4" />
                    PDFからインポート
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/seller/pool/new">
                    <Plus className="mr-1.5 h-4 w-4" />
                    問題を作成
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allQuestions.map((item) => (
              <Link
                key={item.id}
                href={`/seller/pool/${item.id}/edit`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/20 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Question text preview */}
                    <p className="line-clamp-2 text-sm font-medium">
                      {item.question_text?.slice(0, 120) ||
                        "（問題テキストなし）"}
                    </p>

                    {/* Metadata row — text-based, minimal */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {ANSWER_TYPE_LABELS[
                          item.question_type as AnswerType
                        ] ??
                          TYPE_LABELS[item.question_type] ??
                          item.question_type}
                      </span>
                      {item.subject && (
                        <span>
                          {SUBJECT_LABELS[item.subject as Subject]}
                        </span>
                      )}
                      {item.difficulty && (
                        <span>
                          {DIFFICULTY_LABELS[item.difficulty as Difficulty]}
                        </span>
                      )}
                      {item.points && (
                        <span className="tabular-nums">{item.points}点</span>
                      )}
                      {item.vertical_text && (
                        <span>縦書き</span>
                      )}
                      {item.topic_tags?.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}
