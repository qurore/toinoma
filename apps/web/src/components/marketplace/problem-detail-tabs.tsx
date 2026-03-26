"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { SampleQuestionPreview } from "@/components/marketplace/sample-question-preview";
import type { AnswerType } from "@/types/database";

interface ProblemDetailTabsProps {
  description: string | null;
  previewQuestions: Array<{
    id: string;
    question_type: AnswerType;
    question_text: string;
    points: number;
  }>;
  problemPdfUrl: string | null;
  hasPurchased: boolean;
  problemSetId: string;
  sellerId: string;
  userId: string | null;
  reviewsSection: ReactNode;
  qaSection: ReactNode;
  /** Optional review count to display on the reviews tab */
  reviewCount?: number;
  /** Optional Q&A count to display on the Q&A tab */
  qaCount?: number;
}

export function ProblemDetailTabs({
  description,
  previewQuestions,
  problemPdfUrl,
  hasPurchased,
  reviewsSection,
  qaSection,
  reviewCount,
  qaCount,
}: ProblemDetailTabsProps) {
  // Activate tab based on URL hash (#reviews, #qa)
  const [activeTab, setActiveTab] = useState("overview");
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "reviews" || hash === "qa") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from external system (URL hash)
      setActiveTab(hash);
    }
  }, []);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full justify-start gap-0 overflow-x-auto rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="overview"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          概要
        </TabsTrigger>
        {(previewQuestions.length > 0 || problemPdfUrl) && (
          <TabsTrigger
            value="sample"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
              問題プレビュー
          </TabsTrigger>
        )}
        <TabsTrigger
          value="reviews"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          レビュー
          {reviewCount != null && reviewCount > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {reviewCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="qa"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Q&A
          {qaCount != null && qaCount > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {qaCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Overview tab */}
      <TabsContent value="overview" className="mt-6 space-y-6">
        {description ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              問題セットについて
            </h3>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {description}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              この問題セットにはまだ説明が追加されていません
            </p>
          </div>
        )}
      </TabsContent>

      {/* Sample / PDF tab */}
      {(previewQuestions.length > 0 || problemPdfUrl) && (
        <TabsContent value="sample" className="mt-6 space-y-6">
          {/* Sample questions */}
          {previewQuestions.length > 0 && (
            <SampleQuestionPreview questions={previewQuestions} />
          )}

          {/* Problem PDF preview */}
          {problemPdfUrl && (
            <Card>
              <CardHeader>
                <h2 className="font-display text-base font-semibold leading-none tracking-tight">
                  問題PDF
                </h2>
              </CardHeader>
              <CardContent>
                {hasPurchased ? (
                  <div>
                    <iframe
                      src={problemPdfUrl}
                      className="h-[400px] w-full rounded-lg border border-border sm:h-[600px]"
                      title="問題PDF"
                    />
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      PDFを読み込めない場合は{" "}
                      <a
                        href={problemPdfUrl}
                        download
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" aria-hidden="true" />
                        ダウンロード
                      </a>
                      {" "}してください
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 py-16">
                    <p className="text-sm text-muted-foreground">
                      購入後に問題PDFを閲覧できます
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      )}

      {/* Reviews tab */}
      <TabsContent value="reviews" className="mt-6" id="reviews">
        {reviewsSection}
      </TabsContent>

      {/* Q&A tab */}
      <TabsContent value="qa" className="mt-6" id="qa">
        {qaSection}
      </TabsContent>
    </Tabs>
  );
}
