import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { StructuredContentView } from "@/components/structured/structured-content-view";
import type {
  Database,
} from "@toinoma/shared/types";
import type { StructuredContent } from "@toinoma/shared/schemas";

export const dynamic = "force-dynamic";

type Row = Database["public"]["Tables"]["problem_sets"]["Row"];

export default async function ProblemContentPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/problem/${id}/content`);

  const { data: ps } = await supabase
    .from("problem_sets")
    .select("*")
    .eq("id", id)
    .single<Row>();
  if (!ps) notFound();

  // Access control: must own (seller) OR have purchased OR be a free problem.
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  const isOwner = seller?.id && seller.id === ps.seller_id;

  let isPurchased = false;
  if (!isOwner && ps.price > 0) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("problem_set_id", id)
      .maybeSingle();
    isPurchased = !!purchase;
    if (!isPurchased) {
      redirect(`/problem/${id}`);
    }
  }

  if (!ps.structured_content) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: ps.title, href: `/problem/${id}` },
            { label: "問題内容" },
          ]}
        />
        <h1 className="text-2xl font-bold mt-4">問題内容</h1>
        <p className="mt-3 text-foreground/70">
          この問題セットには構造化された問題本文が登録されていません。
        </p>
        {ps.problem_pdf_url && (
          <div className="mt-4">
            <Button asChild>
              <a href={ps.problem_pdf_url} target="_blank" rel="noreferrer">
                PDFを開く
              </a>
            </Button>
          </div>
        )}
      </div>
    );
  }

  const content = ps.structured_content as unknown as StructuredContent;

  const { data: assets } = await supabase
    .from("content_assets")
    .select("*")
    .eq("problem_set_id", id);

  const assetMap: Record<string, { url: string; alt?: string; mime?: string }> = {};
  for (const a of assets ?? []) {
    const url = supabase.storage
      .from(a.storage_bucket)
      .getPublicUrl(a.storage_path).data.publicUrl;
    assetMap[a.id] = { url, alt: a.alt_text ?? undefined, mime: a.mime_type };
    if (a.label) assetMap[a.label] = assetMap[a.id]!;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: ps.title, href: `/problem/${id}` },
          { label: "問題内容" },
        ]}
      />
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{ps.title}</h1>
        <div className="flex gap-2">
          {isOwner && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/seller/sets/${id}/content`}>編集</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/problem/${id}/solve`}>解答ページへ</Link>
          </Button>
        </div>
      </div>
      <article className="bg-card border rounded-lg p-6">
        <StructuredContentView content={content} assets={assetMap} inert />
      </article>
    </div>
  );
}
