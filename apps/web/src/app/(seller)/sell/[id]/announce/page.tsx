import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AnnouncementForm } from "./announcement-form";

export default async function AnnouncePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireSellerTos();
  const supabase = await createClient();

  // Verify ownership of the problem set
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, title, seller_id")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single();

  if (!ps) notFound();

  // Get purchaser count for display
  const { count: purchaserCount } = await supabase
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("problem_set_id", id);

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/sell/${id}/edit`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            戻る
          </Link>
        </Button>
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight">
        購入者へのお知らせ
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        「{ps.title}」の購入者全員（{purchaserCount ?? 0}人）にお知らせを送信します
      </p>

      <AnnouncementForm
        problemSetId={id}
        purchaserCount={purchaserCount ?? 0}
      />
    </main>
  );
}
