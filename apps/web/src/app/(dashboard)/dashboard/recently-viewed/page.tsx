import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Eye } from "lucide-react";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

export default async function RecentlyViewedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getRecentlyViewed(user.id, 50);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Eye className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">最近閲覧した問題</h1>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              まだ閲覧履歴がありません
            </p>
            <Button className="mt-4" asChild>
              <Link href="/explore">問題を探す</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const ps = item.problem_set;
            if (!ps) return null;

            const priceLabel =
              ps.price === 0 ? "無料" : `¥${ps.price.toLocaleString()}`;

            return (
              <Link
                key={item.id}
                href={`/problem/${ps.id}`}
                className="group block"
              >
                <Card className="transition-all duration-150 hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold group-hover:text-primary">
                        {ps.title}
                      </h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {SUBJECT_LABELS[ps.subject as Subject]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
                        </Badge>
                        {ps.university && (
                          <span className="text-xs text-muted-foreground">
                            {ps.university}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-primary">
                        {priceLabel}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.viewed_at), {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </span>
                    </div>
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
