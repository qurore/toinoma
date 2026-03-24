import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, GraduationCap, Flag, Download } from "lucide-react";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import { PurchaseSection } from "@/components/marketplace/purchase-section";
import { AddToCollectionDialog } from "@/components/collections/add-to-collection-dialog";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { ShareButton } from "@/components/navigation/share-button";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { QaSection } from "@/components/qa/qa-section";
import { PdfDownloadButton } from "@/components/solving/pdf-download-button";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import { ProblemSetCard } from "@/components/marketplace/problem-set-card";
import { SampleQuestionPreview } from "@/components/marketplace/sample-question-preview";
import { trackView } from "@/lib/recently-viewed";
import {
  generateProblemSetMetadata,
  buildProductJsonLd,
} from "@/lib/metadata";
import type { Subject, Difficulty, AnswerType } from "@/types/database";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ps } = await supabase
    .from("problem_sets")
    .select(
      "id, title, description, subject, university, difficulty, price, cover_image_url, seller_id"
    )
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!ps) {
    return { title: "問題セット - 問の間" };
  }

  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("seller_display_name")
    .eq("id", ps.seller_id)
    .single();

  return generateProblemSetMetadata({
    id: ps.id,
    title: ps.title,
    description: ps.description,
    subject: ps.subject as Subject,
    difficulty: ps.difficulty as Difficulty,
    university: ps.university,
    price: ps.price,
    cover_image_url: ps.cover_image_url,
    seller_display_name: seller?.seller_display_name ?? null,
  });
}

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [navbarData, supabase] = await Promise.all([
    getNavbarData(),
    createClient(),
  ]);

  // Fetch problem set with seller info
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, title, description, subject, university, difficulty, price, problem_pdf_url, seller_id, status, preview_question_ids")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!ps) notFound();

  // Fetch seller separately to avoid type inference issue with joins
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("seller_display_name, university")
    .eq("id", ps.seller_id)
    .single();

  // Check if user has purchased
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasPurchased = false;
  if (user) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("problem_set_id", id)
      .single();
    hasPurchased = !!purchase;
  }

  // MKT-018: Track recently viewed (fire-and-forget for authenticated users)
  if (user) {
    trackView(user.id, id).catch(() => {
      // Silently ignore tracking errors — non-critical
    });
  }

  // MKT-011: Fetch preview questions if available
  const previewQuestionIds = (ps.preview_question_ids ?? []) as string[];
  let previewQuestions: Array<{
    id: string;
    question_type: AnswerType;
    question_text: string;
    points: number;
  }> = [];
  if (previewQuestionIds.length > 0) {
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_type, question_text, points")
      .in("id", previewQuestionIds.slice(0, 2));
    previewQuestions = (questions ?? []) as typeof previewQuestions;
  }

  // MKT-013: Fetch related problem sets (same subject, excluding current)
  const { data: relatedSets } = await supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, cover_image_url, university, seller_id")
    .eq("subject", ps.subject)
    .eq("status", "published")
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(4);

  // Fetch seller display names for related sets
  let relatedWithSellers: Array<{
    id: string;
    title: string;
    subject: Subject;
    difficulty: Difficulty;
    price: number;
    cover_image_url: string | null;
    university: string | null;
    seller_display_name: string | null;
  }> = [];
  if (relatedSets && relatedSets.length > 0) {
    const sellerIds = [...new Set(relatedSets.map((s) => s.seller_id))];
    const { data: sellers } = await supabase
      .from("seller_profiles")
      .select("id, seller_display_name")
      .in("id", sellerIds);
    const sellerMap = new Map(
      (sellers ?? []).map((s) => [s.id, s.seller_display_name])
    );
    relatedWithSellers = relatedSets.map((s) => ({
      id: s.id,
      title: s.title,
      subject: s.subject as Subject,
      difficulty: s.difficulty as Difficulty,
      price: s.price,
      cover_image_url: s.cover_image_url,
      university: s.university,
      seller_display_name: sellerMap.get(s.seller_id) ?? null,
    }));
  }

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="container mx-auto max-w-3xl px-4 py-8 pt-16">
      {/* Breadcrumb-style navigation — browser back handles context-aware return */}
      <nav aria-label="パンくずリスト" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="transition-colors hover:text-foreground">
              ホーム
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/explore" className="transition-colors hover:text-foreground">
              問題を探す
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="truncate text-foreground" aria-current="page">
            {ps.title}
          </li>
        </ol>
      </nav>

      <div className="space-y-6">
        {/* Header with share button */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {ps.title}
            </h1>
            <ShareButton title={ps.title} className="shrink-0" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {SUBJECT_LABELS[ps.subject as Subject]}
            </Badge>
            <Badge variant="outline">
              {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
            </Badge>
            {ps.university && (
              <Badge variant="secondary">{ps.university}</Badge>
            )}
          </div>
        </div>

        {ps.description && (
          <p className="text-muted-foreground">{ps.description}</p>
        )}

        {/* MKT-011: Sample question preview */}
        {previewQuestions.length > 0 && (
          <SampleQuestionPreview questions={previewQuestions} />
        )}

        <Separator />

        {/* Seller info */}
        {seller && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{seller.seller_display_name}</p>
                {seller.university && (
                  <p className="text-sm text-muted-foreground">
                    {seller.university}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Problem PDF Preview */}
        {ps.problem_pdf_url && (
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 font-display text-base font-semibold leading-none tracking-tight">
                <FileText className="h-4 w-4" />
                問題PDF
              </h2>
            </CardHeader>
            <CardContent>
              {hasPurchased ? (
                <div>
                  <iframe
                    src={ps.problem_pdf_url}
                    className="h-[300px] w-full rounded-lg border border-border sm:h-[500px] lg:h-[600px]"
                    title="問題PDF"
                  />
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    PDFを読み込めない場合は{" "}
                    <a
                      href={ps.problem_pdf_url}
                      download
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" />
                      ダウンロード
                    </a>
                    {" "}してください
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 py-16">
                  <p className="text-muted-foreground">
                    購入後に問題PDFを閲覧できます
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Collection + PDF actions for purchased users */}
        {hasPurchased && user && (
          <div className="flex items-center justify-end gap-2">
            <PdfDownloadButton problemSetId={id} />
            <AddToCollectionDialog problemSetId={id} />
          </div>
        )}

        {/* Purchase / Solve section */}
        <PurchaseSection
          problemSetId={id}
          price={ps.price}
          hasPurchased={hasPurchased}
          isLoggedIn={!!user}
          sellerId={ps.seller_id}
        />

        {/* Reviews */}
        <ReviewsSection
          problemSetId={id}
          userId={user?.id ?? null}
        />

        {/* Q&A */}
        <QaSection
          problemSetId={id}
          sellerId={ps.seller_id}
          userId={user?.id ?? null}
        />

        {/* MKT-013: Related problem sets */}
        {relatedWithSellers.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="mb-4 text-lg font-semibold">関連する問題セット</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedWithSellers.map((related) => (
                  <ProblemSetCard
                    key={related.id}
                    data={related}
                    userId={user?.id ?? null}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Report content */}
        <div className="flex justify-end">
          <ReportDialog
            targetType="problem_set"
            targetId={id}
            trigger={
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                <Flag className="mr-1 h-3 w-3" />
                この問題セットを報告
              </Button>
            }
          />
        </div>
      </div>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildProductJsonLd({
            id: ps.id,
            title: ps.title,
            description: ps.description,
            subject: ps.subject as Subject,
            difficulty: ps.difficulty as Difficulty,
            university: ps.university,
            price: ps.price,
            cover_image_url: null,
            seller_display_name: seller?.seller_display_name ?? null,
          }),
        }}
      />
    </main>
    </>
  );
}
