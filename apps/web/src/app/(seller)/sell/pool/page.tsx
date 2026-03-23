import Link from "next/link";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, CheckSquare, Type, ListChecks } from "lucide-react";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "問題プール - 問の間",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromUntyped(supabase: SupabaseClient<any>, table: string) {
  return supabase.from(table);
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  essay: FileText,
  mark_sheet: CheckSquare,
  fill_in_blank: Type,
  multiple_choice: ListChecks,
};

const TYPE_LABELS: Record<string, string> = {
  essay: "記述式",
  mark_sheet: "マーク式",
  fill_in_blank: "穴埋め式",
  multiple_choice: "選択式",
};

export default async function ProblemPoolPage() {
  const { user } = await requireSellerTos();
  const supabase = await createClient();

  const { data: questions } = await fromUntyped(supabase, "questions")
    .select("id, question_type, question_text, subject, difficulty, points, vertical_text, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const allQuestions = (questions ?? []) as Array<{
    id: string;
    question_type: string;
    question_text: string;
    subject: string;
    difficulty: string;
    points: number;
    vertical_text: boolean;
    created_at: string;
  }>;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sell">
            <ArrowLeft className="mr-1 h-4 w-4" />
            ダッシュボード
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">問題プール</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            個別の問題を管理し、問題セットに組み合わせましょう
          </p>
        </div>
        <Button asChild>
          <Link href="/sell/pool/new">
            <Plus className="mr-1.5 h-4 w-4" />
            問題を作成
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
        <span>{allQuestions.length} 問</span>
        {Object.entries(TYPE_LABELS).map(([type, label]) => {
          const count = allQuestions.filter((q) => q.question_type === type).length;
          return count > 0 ? (
            <span key={type}>
              {label}: {count}
            </span>
          ) : null;
        })}
      </div>

      {allQuestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-2 text-lg font-medium">
              問題プールに問題がありません
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              問題を作成して、プールにストックしましょう
            </p>
            <Button asChild>
              <Link href="/sell/pool/new">最初の問題を作成</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allQuestions.map((q) => {
            const Icon = TYPE_ICONS[q.question_type] ?? FileText;
            return (
              <Card key={q.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-foreground/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {q.question_text.slice(0, 80)}
                      {q.question_text.length > 80 ? "..." : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[q.question_type] ?? q.question_type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {SUBJECT_LABELS[q.subject as Subject]}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {DIFFICULTY_LABELS[q.difficulty as Difficulty]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {q.points}点
                      </span>
                      {q.vertical_text && (
                        <Badge variant="outline" className="text-xs">
                          縦書き
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/sell/pool/${q.id}`}>編集</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
