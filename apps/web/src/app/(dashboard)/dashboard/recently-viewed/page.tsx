import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Eye, Search } from "lucide-react";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import type { Subject, Difficulty } from "@/types/database";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "最近閲覧した問題 | 問の間",
};

export default async function RecentlyViewedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getRecentlyViewed(user.id, 50);

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "マイページ", href: "/dashboard" },
          { label: "最近閲覧した問題", href: "/dashboard/recently-viewed" },
        ]}
      />

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Eye className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            最近閲覧した問題
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length}件の閲覧履歴
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h2 className="mb-2 text-lg font-semibold">
              まだ閲覧履歴がありません
            </h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              問題セットの詳細ページを閲覧すると、ここに履歴が表示されます。
            </p>
            <Button asChild>
              <Link href="/explore">
                <Search className="mr-1.5 h-4 w-4" />
                問題を探す
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const ps = item.problem_set;
            if (!ps) return null;

            const priceLabel =
              ps.price === 0 ? "無料" : `¥${ps.price.toLocaleString()}`;

            const viewedAgo = formatDistanceToNow(
              new Date(item.viewed_at),
              { addSuffix: true, locale: ja }
            );

            return (
              <Link
                key={item.id}
                href={`/problem/${ps.id}`}
                className="group block"
              >
                <Card className="transition-all hover:border-primary/20 hover:shadow-sm">
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
                      <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {viewedAgo}
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
