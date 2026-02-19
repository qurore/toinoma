import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: favorites } = await supabase
    .from("favorites")
    .select("id, problem_set_id, problem_sets(title, subject, difficulty, price)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = favorites ?? [];

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">お気に入り</h1>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              お気に入りの問題セットがありません
            </p>
            <Button className="mt-4" asChild>
              <Link href="/explore">問題を探す</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((fav) => {
            const ps = fav.problem_sets as unknown as {
              title: string;
              subject: string;
              difficulty: string;
              price: number;
            } | null;

            return (
              <Link key={fav.id} href={`/problem/${fav.problem_set_id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <h2 className="mb-2 line-clamp-2 font-semibold">
                      {ps?.title ?? "Unknown"}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      {ps?.subject && (
                        <Badge variant="outline">
                          {SUBJECT_LABELS[ps.subject as Subject]}
                        </Badge>
                      )}
                      {ps?.difficulty && (
                        <Badge variant="outline">
                          {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
                        </Badge>
                      )}
                    </div>
                    {ps && (
                      <div className="mt-3 text-right">
                        <span className="text-lg font-bold text-primary">
                          {ps.price === 0
                            ? "無料"
                            : `¥${ps.price.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
