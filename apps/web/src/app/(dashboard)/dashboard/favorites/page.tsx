import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { FavoritesClient } from "./favorites-client";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お気に入り | 問の間",
};

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: favorites } = await supabase
    .from("favorites")
    .select(
      "id, problem_set_id, created_at, problem_sets(id, title, subject, difficulty, price, cover_image_url, university, seller_id)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Gather seller IDs and fetch display names
  const sellerIds = [
    ...new Set(
      (favorites ?? [])
        .map((f) => {
          const ps = f.problem_sets as unknown as { seller_id: string } | null;
          return ps?.seller_id;
        })
        .filter(Boolean) as string[]
    ),
  ];

  let sellerMap = new Map<string, string>();
  if (sellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from("seller_profiles")
      .select("id, seller_display_name")
      .in("id", sellerIds);
    sellerMap = new Map(
      (sellers ?? []).map((s) => [s.id, s.seller_display_name])
    );
  }

  const items = (favorites ?? []).map((fav) => {
    const ps = fav.problem_sets as unknown as {
      id: string;
      title: string;
      subject: string;
      difficulty: string;
      price: number;
      cover_image_url: string | null;
      university: string | null;
      seller_id: string;
    } | null;

    return {
      favoriteId: fav.id,
      problemSetId: fav.problem_set_id,
      createdAt: fav.created_at,
      card: ps
        ? {
            id: ps.id,
            title: ps.title,
            subject: ps.subject as Subject,
            difficulty: ps.difficulty as Difficulty,
            price: ps.price,
            cover_image_url: ps.cover_image_url,
            university: ps.university,
            seller_display_name: sellerMap.get(ps.seller_id) ?? null,
          }
        : null,
    };
  });

  // Derive available subjects for filter options
  const subjectOptions = Array.from(
    new Set(
      items.filter((i) => i.card?.subject).map((i) => i.card!.subject)
    )
  ).map((s) => ({
    value: s,
    label: SUBJECT_LABELS[s] ?? s,
  }));

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "マイページ", href: "/dashboard" },
          { label: "お気に入り", href: "/dashboard/favorites" },
        ]}
      />
      <FavoritesClient
        items={items}
        userId={user.id}
        subjectOptions={subjectOptions}
      />
    </main>
  );
}
