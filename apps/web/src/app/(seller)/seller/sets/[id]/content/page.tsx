import { notFound } from "next/navigation";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { StructuredContentClient } from "./structured-content-client";
import type {
  Database,
  Subject,
} from "@toinoma/shared/types";
import type { StructuredContent } from "@toinoma/shared/schemas";

export const dynamic = "force-dynamic";

type Row = Database["public"]["Tables"]["problem_sets"]["Row"];

export default async function StructuredContentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireSellerTos();
  const supabase = await createClient();

  const { data: ps } = await supabase
    .from("problem_sets")
    .select("*")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single<Row>();
  if (!ps) notFound();

  const { data: assets } = await supabase
    .from("content_assets")
    .select("*")
    .eq("problem_set_id", id);

  const sourcePdfUrl = ps.source_pdf_path
    ? supabase.storage.from("problem-pdfs").getPublicUrl(ps.source_pdf_path).data.publicUrl
    : ps.problem_pdf_url ?? null;

  const initial: StructuredContent =
    (ps.structured_content as unknown as StructuredContent | null) ??
    blankStructuredContent(ps.subject as Subject);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "出品者ダッシュボード", href: "/seller" },
          { label: "問題セット", href: "/seller/sets" },
          { label: ps.title, href: `/seller/sets/${id}/edit` },
          { label: "問題内容" },
        ]}
      />

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">問題内容の編集</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            PDFやDOCXからインポート、またはエディタで直接編集できます。
          </p>
        </div>
      </div>

      <StructuredContentClient
        problemSetId={id}
        subject={ps.subject as Subject}
        initial={initial}
        sourcePdfUrl={sourcePdfUrl ?? undefined}
        assets={(assets ?? []).map((a) => ({
          id: a.id,
          label: a.label,
          publicUrl: supabase.storage
            .from(a.storage_bucket)
            .getPublicUrl(a.storage_path).data.publicUrl,
          mime: a.mime_type,
          alt: a.alt_text,
        }))}
      />
    </div>
  );
}

function blankStructuredContent(subject: Subject): StructuredContent {
  const verticalSubjects = new Set<Subject>(["japanese"]);
  return {
    version: 1,
    defaultWritingMode: verticalSubjects.has(subject) ? "vertical" : "horizontal",
    defaultLang:
      subject === "english"
        ? "en"
        : verticalSubjects.has(subject)
          ? "ja-modern"
          : "ja-modern",
    subject,
    body: [
      {
        kind: "instruction",
        children: [
          { kind: "text", value: "ここに問題文を入力するか、上のボタンからPDFをインポートしてください。" },
        ],
      },
    ],
  };
}
