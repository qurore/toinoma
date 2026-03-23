import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("seller_display_name")
    .eq("id", id)
    .single();

  return {
    title: seller
      ? `${seller.seller_display_name} - 問の間`
      : "出品者プロフィール - 問の間",
  };
}

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const navbarData = await getNavbarData();

  // Fetch seller profile
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("id, seller_display_name, seller_description, university, circle_name, tos_accepted_at, stripe_account_id")
    .eq("id", id)
    .single();

  if (!seller?.tos_accepted_at) notFound();

  // Fetch user profile for avatar
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", id)
    .single();

  // Fetch published problem sets
  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, status, created_at")
    .eq("seller_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const sets = problemSets ?? [];

  // Count purchases across all sets
  const setIds = sets.map((s) => s.id);
  const { count: totalStudents } = setIds.length > 0
    ? await supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .in("problem_set_id", setIds)
    : { count: 0 };

  const displayName =
    seller.seller_display_name !== "__pending__"
      ? seller.seller_display_name
      : profile?.display_name ?? "出品者";

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="container mx-auto px-4 py-8 pt-20">
        {/* Profile header */}
        <div className="mb-8 flex items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage
              src={profile?.avatar_url ?? undefined}
              alt={displayName}
            />
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {displayName}
            </h1>
            {seller.university && (
              <p className="mt-1 text-sm text-muted-foreground">
                {seller.university}
                {seller.circle_name && ` / ${seller.circle_name}`}
              </p>
            )}
            {seller.seller_description && (
              <p className="mt-2 max-w-lg text-sm text-foreground/80">
                {seller.seller_description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span>{sets.length} 問題セット</span>
              <span>{totalStudents ?? 0} 購入者</span>
            </div>
          </div>
        </div>

        {/* Problem sets */}
        <h2 className="mb-4 text-lg font-semibold">公開中の問題セット</h2>
        {sets.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            公開中の問題セットはありません
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((ps) => (
              <Link key={ps.id} href={`/problem/${ps.id}`}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {SUBJECT_LABELS[ps.subject as Subject]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
                      </Badge>
                    </div>
                    <p className="mb-2 font-medium">{ps.title}</p>
                    <p className="text-sm font-semibold text-primary">
                      {ps.price === 0
                        ? "無料"
                        : `¥${ps.price.toLocaleString()}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
