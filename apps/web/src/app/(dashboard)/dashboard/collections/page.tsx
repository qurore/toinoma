import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";

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
    .order("updated_at", { ascending: false });

  // Get item counts for each collection
  const items = collections ?? [];
  const collectionIds = items.map((c) => c.id);

  let itemCounts: Record<string, number> = {};
  if (collectionIds.length > 0) {
    const { data: countData } = await supabase
      .from("collection_items")
      .select("collection_id")
      .in("collection_id", collectionIds);

    if (countData) {
      itemCounts = countData.reduce(
        (acc, item) => {
          acc[item.collection_id] = (acc[item.collection_id] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">コレクション</h1>
        <CreateCollectionDialog />
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg text-muted-foreground">
              コレクションがまだありません
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              購入した問題セットをコレクションにまとめて学習しましょう
            </p>
            <CreateCollectionDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((collection) => (
            <Link
              key={collection.id}
              href={`/dashboard/collections/${collection.id}`}
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1 text-base">
                    {collection.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {collection.description && (
                    <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                      {collection.description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {itemCounts[collection.id] ?? 0}問
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
