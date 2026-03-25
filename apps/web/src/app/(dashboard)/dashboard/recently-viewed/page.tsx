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
import { ClearHistoryButton } from "./clear-history-button";
import type { Subject, Difficulty } from "@/types/database";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "最近閲覧した問題 - 問の間",
};

export default async function RecentlyViewedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getRecentlyViewed(user.id, 50);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "マイページ", href: "/dashboard" },
          { label: "最近閲覧した問題", href: "/dashboard/recently-viewed" },
        ]}
      />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            最近閲覧した問題
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length}件の閲覧履歴
          </p>
        </div>
        {items.length > 0 && <ClearHistoryButton />}
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[40vh] flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
              <Eye className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              まだ閲覧した問題がありません
            </h2>
            <p className="mb-2 max-w-md text-sm text-muted-foreground">
              問題セットの詳細ページを開くと、自動的にここに履歴が記録されます。
            </p>
            <p className="mb-8 max-w-md text-sm text-muted-foreground">
              気になっていた問題をあとから簡単に見つけられます。
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                <Card className="h-full transition-all hover:border-primary/20 hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                        {ps.title}
                      </h2>
                      <span className="shrink-0 text-sm font-bold text-primary">
                        {priceLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="border border-border text-xs">
                        {SUBJECT_LABELS[ps.subject as Subject]}
                      </Badge>
                      <Badge variant="secondary" className="border border-border text-xs">
                        {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
                      </Badge>
                      {ps.university && (
                        <span className="text-xs text-muted-foreground">
                          {ps.university}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {viewedAgo}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
