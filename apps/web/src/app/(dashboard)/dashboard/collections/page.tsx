import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, BookOpen, Clock } from "lucide-react";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "コレクション - 問の間",
};

export default async function CollectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, description, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Get item counts per collection
  const collectionIds = (collections ?? []).map((c) => c.id);
  const itemCounts: Record<string, number> = {};
  if (collectionIds.length > 0) {
    const { data: items } = await supabase
      .from("collection_items")
      .select("collection_id")
      .in("collection_id", collectionIds);
    for (const item of items ?? []) {
      itemCounts[item.collection_id] =
        (itemCounts[item.collection_id] ?? 0) + 1;
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "マイページ", href: "/dashboard" },
          { label: "コレクション", href: "/dashboard/collections" },
        ]}
      />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">コレクション</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            問題をまとめて効率的に復習しましょう
          </p>
        </div>
        <CreateCollectionDialog />
      </div>

      {!collections?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[40vh] flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
              <FolderOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              コレクションを作成しましょう
            </h2>
            <p className="mb-2 max-w-md text-sm text-muted-foreground">
              コレクションは、購入した問題セットから好きな問題をまとめて管理できる機能です。
            </p>
            <p className="mb-8 max-w-md text-sm text-muted-foreground">
              苦手分野の集中対策や、模試直前の総復習など、自分だけの学習セットを作りましょう。
            </p>
            <CreateCollectionDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => {
            const updatedAt =
              c.updated_at ?? c.created_at;
            const timeAgo = formatDistanceToNow(new Date(updatedAt), {
              addSuffix: true,
              locale: ja,
            });
            const count = itemCounts[c.id] ?? 0;

            return (
              <Link key={c.id} href={`/dashboard/collections/${c.id}`}>
                <Card className="h-full transition-all hover:border-primary/20 hover:shadow-sm">
                  <CardContent className="p-5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold">{c.name}</h3>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        <BookOpen className="mr-1 h-3 w-3" />
                        {count}問
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo}
                      </span>
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
