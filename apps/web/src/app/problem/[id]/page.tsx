import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, GraduationCap, Flag } from "lucide-react";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import { PurchaseSection } from "@/components/marketplace/purchase-section";
import { AddToCollectionDialog } from "@/components/collections/add-to-collection-dialog";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { ShareButton } from "@/components/navigation/share-button";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { QaSection } from "@/components/qa/qa-section";
import { PdfDownloadButton } from "@/components/solving/pdf-download-button";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import {
  generateProblemSetMetadata,
  buildProductJsonLd,
} from "@/lib/metadata";
import type { Subject, Difficulty } from "@/types/database";
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
    .select("id, title, description, subject, university, difficulty, price, problem_pdf_url, seller_id, status")
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

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="container mx-auto max-w-3xl px-4 py-8 pt-[calc(3.5rem+2rem)]">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/explore">問題一覧に戻る</Link>
        </Button>
      </div>

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
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                問題PDF
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasPurchased ? (
                <iframe
                  src={ps.problem_pdf_url}
                  className="h-[600px] w-full rounded-lg border border-border"
                  title="問題PDF"
                />
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
