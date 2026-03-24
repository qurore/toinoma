"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Download, MessageSquare, HelpCircle, Eye } from "lucide-react";
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
}

export function ProblemDetailTabs({
  description,
  previewQuestions,
  problemPdfUrl,
  hasPurchased,
  problemSetId,
  sellerId,
  userId,
  reviewsSection,
  qaSection,
}: ProblemDetailTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start gap-0 overflow-x-auto rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="overview"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          概要
        </TabsTrigger>
        {(previewQuestions.length > 0 || problemPdfUrl) && (
          <TabsTrigger
            value="sample"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            問題プレビュー
          </TabsTrigger>
        )}
        <TabsTrigger
          value="reviews"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          レビュー
        </TabsTrigger>
        <TabsTrigger
          value="qa"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
          Q&A
        </TabsTrigger>
      </TabsList>

      {/* Overview tab */}
      <TabsContent value="overview" className="mt-6 space-y-6">
        {description ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              問題セットについて
            </h3>
            <p className="whitespace-pre-wrap leading-relaxed text-foreground">
              {description}
            </p>
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
                <h2 className="flex items-center gap-2 font-display text-base font-semibold leading-none tracking-tight">
                  <FileText className="h-4 w-4" />
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
                        <Download className="h-3 w-3" />
                        ダウンロード
                      </a>
                      {" "}してください
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 py-16">
                    <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
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
