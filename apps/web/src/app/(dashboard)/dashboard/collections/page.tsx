import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, BookOpen } from "lucide-react";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "コレクション | 問の間",
};

export default async function CollectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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
    <main className="container mx-auto px-4 py-8">
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
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h2 className="mb-2 text-lg font-semibold">
              コレクションがありません
            </h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              購入した問題セットの中から気になる問題をピックアップして、自分だけのコレクションを作りましょう。
            </p>
            <CreateCollectionDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} href={`/dashboard/collections/${c.id}`}>
              <Card className="h-full transition-all hover:border-primary/20 hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
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
                      {itemCounts[c.id] ?? 0}問
                    </Badge>
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
