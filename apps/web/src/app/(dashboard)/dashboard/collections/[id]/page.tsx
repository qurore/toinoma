import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CollectionItemList } from "@/components/collections/collection-item-list";
import { CollectionSettings } from "@/components/collections/collection-settings";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch collection
  const { data: collection } = await supabase
    .from("collections")
    .select("id, name, description, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!collection) notFound();

  // Fetch collection items with problem set data
  const { data: items } = await supabase
    .from("collection_items")
    .select(
      "id, problem_set_id, position, problem_sets(title, subject, difficulty, price)"
    )
    .eq("collection_id", id)
    .order("position", { ascending: true });

  const typedItems = (items ?? []).map((item) => ({
    ...item,
    problem_sets: item.problem_sets as unknown as {
      title: string;
      subject: string;
      difficulty: string;
      price: number;
    } | null,
  }));

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/collections">
            <ArrowLeft className="mr-1 h-4 w-4" />
            コレクション一覧
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-1 text-muted-foreground">
              {collection.description}
            </p>
          )}
        </div>
        <CollectionSettings
          collectionId={collection.id}
          name={collection.name}
          description={collection.description}
        />
      </div>

      <CollectionItemList collectionId={id} items={typedItems} />
    </main>
  );
}
