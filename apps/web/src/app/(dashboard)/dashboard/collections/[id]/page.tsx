import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CollectionItemList } from "@/components/collections/collection-item-list";
import { CollectionSettings } from "@/components/collections/collection-settings";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: collection } = await supabase
    .from("collections")
    .select("name")
    .eq("id", id)
    .single();

  return {
    title: collection
      ? `${collection.name} | コレクション | 問の間`
      : "コレクション | 問の間",
  };
}

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

  const itemCount = typedItems.length;

  // Compute unique subjects covered in this collection
  const uniqueSubjects = [
    ...new Set(
      typedItems
        .map((item) => item.problem_sets?.subject)
        .filter((s): s is string => !!s)
    ),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "マイページ", href: "/dashboard" },
          { label: "コレクション", href: "/dashboard/collections" },
          { label: collection.name },
        ]}
      />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-1 text-muted-foreground">
              {collection.description}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {itemCount}問
            {uniqueSubjects.length > 0 && (
              <span className="ml-2">
                {uniqueSubjects
                  .map((s) => SUBJECT_LABELS[s as Subject])
                  .join("・")}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {itemCount > 0 && (
            <Button asChild>
              <Link href={`/dashboard/collections/${id}/solve`}>
                解き始める
              </Link>
            </Button>
          )}
          <CollectionSettings
            collectionId={collection.id}
            name={collection.name}
            description={collection.description}
          />
        </div>
      </div>

      {itemCount === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <h2 className="mb-2 text-lg font-semibold">
              まだ問題がありません
            </h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              購入した問題セットの詳細ページから「コレクションに追加」ボタンで問題を追加できます。
            </p>
            <Button variant="outline" asChild>
              <Link href="/explore">問題を探す</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CollectionItemList collectionId={id} items={typedItems} />
      )}
    </div>
  );
}
