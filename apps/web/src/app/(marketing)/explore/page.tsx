import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SUBJECT_LABELS, DIFFICULTY_LABELS, SUBJECTS, DIFFICULTIES } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    subject?: string;
    difficulty?: string;
  }>;
}) {
  const { q, subject, difficulty } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("problem_sets")
    .select(
      "id, title, description, subject, university, difficulty, price, seller_id, created_at"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (subject && (SUBJECTS as readonly string[]).includes(subject)) {
    query = query.eq("subject", subject as Subject);
  }
  if (difficulty && (DIFFICULTIES as readonly string[]).includes(difficulty)) {
    query = query.eq("difficulty", difficulty as Difficulty);
  }
  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data: problemSets } = await query;
  const sets = problemSets ?? [];

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">問題を探す</h1>
      <p className="mb-8 text-muted-foreground">
        大学入試対策の問題セットを見つけよう
      </p>

      {/* Filters */}
      <form className="mb-8 flex flex-wrap items-center gap-3">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="キーワードで検索..."
          className="w-full sm:max-w-xs"
        />
        <select
          name="subject"
          defaultValue={subject ?? ""}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">すべての教科</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {SUBJECT_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          name="difficulty"
          defaultValue={difficulty ?? ""}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">すべての難易度</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          検索
        </button>
      </form>

      {/* Results */}
      {sets.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg">該当する問題セットが見つかりませんでした</p>
          <p className="mt-1 text-sm">検索条件を変えてお試しください</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((ps) => (
            <Link key={ps.id} href={`/problem/${ps.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <h2 className="mb-2 line-clamp-2 font-semibold">
                    {ps.title}
                  </h2>
                  {ps.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {ps.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {SUBJECT_LABELS[ps.subject as Subject]}
                    </Badge>
                    <Badge variant="outline">
                      {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
                    </Badge>
                    {ps.university && (
                      <Badge variant="secondary">{ps.university}</Badge>
                    )}
                  </div>
                  <div className="mt-3 text-right">
                    <span className="text-lg font-bold text-primary">
                      {ps.price === 0
                        ? "無料"
                        : `¥${ps.price.toLocaleString()}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
