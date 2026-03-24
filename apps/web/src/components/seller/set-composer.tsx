"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Save,
  Library,
  LayoutList,
  Settings2,
  AlertCircle,
  CheckCircle2,
  Eye,
} from "lucide-react";
import {
  QuestionPoolBrowser,
  type PoolQuestion,
} from "@/components/seller/question-pool-browser";
import {
  SetStructureEditor,
  type ComposedSectionItem,
  type ComposedQuestionItem,
} from "@/components/seller/set-structure-editor";
import {
  SetMetadataForm,
  type SetMetadata,
} from "@/components/seller/set-metadata-form";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import { createProblemSetFromPool } from "@/app/(seller)/sell/sets/new/actions";

interface SetComposerProps {
  sellerId?: string;
}

export function SetComposer({ sellerId }: SetComposerProps) {
  const [isPending, startTransition] = useTransition();
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<string>("pool");

  // Metadata state
  const [metadata, setMetadata] = useState<SetMetadata>({
    title: "",
    description: "",
    subject: "",
    difficulty: "",
    price: 0,
    timeLimitMinutes: null,
    coverImageUrl: "",
    university: "",
  });

  // Sections state
  const [sections, setSections] = useState<ComposedSectionItem[]>([
    {
      id: crypto.randomUUID(),
      sectionNumber: 1,
      sectionTitle: "第1問",
      questions: [],
    },
  ]);

  // Set of added question IDs for the pool browser
  const addedQuestionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const section of sections) {
      for (const q of section.questions) {
        ids.add(q.questionId);
      }
    }
    return ids;
  }, [sections]);

  // Total points for display
  const totalPoints = useMemo(
    () =>
      sections.reduce(
        (acc, s) =>
          acc +
          s.questions.reduce(
            (qAcc, q) => qAcc + (q.pointsOverride ?? q.originalPoints),
            0
          ),
        0
      ),
    [sections]
  );

  const totalQuestions = useMemo(
    () => sections.reduce((acc, s) => acc + s.questions.length, 0),
    [sections]
  );

  // Add a question from the pool to the last section
  const handleAddQuestion = useCallback(
    (poolQuestion: PoolQuestion) => {
      if (sections.length === 0) {
        const newSection: ComposedSectionItem = {
          id: crypto.randomUUID(),
          sectionNumber: 1,
          sectionTitle: "第1問",
          questions: [],
        };
        const item = poolQuestionToComposed(poolQuestion);
        newSection.questions = [item];
        setSections([newSection]);
        toast.success("問題を追加しました");
        return;
      }

      // Add to the last section
      const targetSection = sections[sections.length - 1];
      const item = poolQuestionToComposed(poolQuestion);

      setSections((prev) =>
        prev.map((s) =>
          s.id === targetSection.id
            ? { ...s, questions: [...s.questions, item] }
            : s
        )
      );
      toast.success("問題を追加しました");
    },
    [sections]
  );

  // Validation checks for publish readiness
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!metadata.title.trim()) errors.push("タイトルを入力してください");
    if (!metadata.subject) errors.push("教科を選択してください");
    if (!metadata.difficulty) errors.push("難易度を選択してください");
    if (totalQuestions === 0)
      errors.push("少なくとも1つの問題を追加してください");
    return errors;
  }, [metadata, totalQuestions]);

  const canSave = validationErrors.length === 0;

  // Save / submit
  function handleSave() {
    if (!canSave) {
      toast.error(validationErrors[0]);
      return;
    }

    startTransition(async () => {
      const payload = {
        title: metadata.title,
        description: metadata.description || null,
        subject: metadata.subject,
        difficulty: metadata.difficulty,
        price: metadata.price,
        timeLimitMinutes: metadata.timeLimitMinutes,
        coverImageUrl: metadata.coverImageUrl || null,
        university: metadata.university || null,
        sections: sections.map((s) => ({
          sectionNumber: s.sectionNumber,
          sectionTitle: s.sectionTitle,
          questions: s.questions.map((q, idx) => ({
            questionId: q.questionId,
            position: idx,
            pointsOverride: q.pointsOverride,
          })),
        })),
      };

      const result = await createProblemSetFromPool(payload);

      if (result?.error) {
        toast.error(result.error);
      }
      // On success, the server action redirects
    });
  }

  // Desktop layout: two-panel side by side
  // Mobile layout: tabs to switch between pool and structure
  return (
    <div className="flex h-full flex-col">
      {/* Top bar: metadata + save */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {metadata.title || "新規問題セット"}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{totalQuestions} 問</span>
            <Separator orientation="vertical" className="h-3" />
            <span>{totalPoints} 点</span>
            {metadata.subject && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span>
                  {SUBJECT_LABELS[metadata.subject as Subject] ??
                    metadata.subject}
                </span>
              </>
            )}
            {metadata.difficulty && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span>
                  {DIFFICULTY_LABELS[metadata.difficulty as Difficulty] ??
                    metadata.difficulty}
                </span>
              </>
            )}
            {metadata.price > 0 && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span>¥{metadata.price.toLocaleString("ja-JP")}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Preview dialog */}
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={totalQuestions === 0}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                プレビュー
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>問題セットプレビュー</DialogTitle>
                <DialogDescription>
                  学生に表示される問題セットのプレビュー
                </DialogDescription>
              </DialogHeader>
              <SetPreview
                metadata={metadata}
                sections={sections}
                totalPoints={totalPoints}
                totalQuestions={totalQuestions}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPreviewOpen(false)}
                >
                  閉じる
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Metadata dialog */}
          <Dialog open={metadataOpen} onOpenChange={setMetadataOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                セット情報
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>問題セット情報</DialogTitle>
                <DialogDescription>
                  問題セットのメタデータを設定してください
                </DialogDescription>
              </DialogHeader>
              <SetMetadataForm
                metadata={metadata}
                onChange={setMetadata}
                sellerId={sellerId}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setMetadataOpen(false)}
                >
                  閉じる
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleSave}
            disabled={isPending || !canSave}
            size="sm"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            作成して保存
          </Button>
        </div>
      </div>

      {/* Validation warnings */}
      {validationErrors.length > 0 && totalQuestions > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            {validationErrors.map((err) => (
              <p key={err}>{err}</p>
            ))}
          </div>
        </div>
      )}

      {/* Publish readiness indicator */}
      {canSave && totalQuestions > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>公開準備完了 — 保存後に公開できます</span>
        </div>
      )}

      {/* Desktop: two-panel layout */}
      <div className="mt-4 hidden flex-1 gap-4 overflow-hidden lg:flex">
        {/* Left panel: question pool */}
        <Card className="flex w-[45%] flex-col overflow-hidden">
          <CardHeader className="shrink-0 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Library className="h-4 w-4" />
              問題プール
            </CardTitle>
            <CardDescription className="text-xs">
              問題を選んでセットに追加
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pb-3">
            <QuestionPoolBrowser
              addedQuestionIds={addedQuestionIds}
              onAddQuestion={handleAddQuestion}
            />
          </CardContent>
        </Card>

        {/* Right panel: set structure */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="shrink-0 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <LayoutList className="h-4 w-4" />
              セット構成
            </CardTitle>
            <CardDescription className="text-xs">
              セクションと問題の順番を編集
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pb-3">
            <SetStructureEditor
              sections={sections}
              onChange={setSections}
            />
          </CardContent>
        </Card>
      </div>

      {/* Mobile: tabbed layout */}
      <div className="mt-4 flex flex-1 flex-col overflow-hidden lg:hidden">
        <Tabs
          value={mobileTab}
          onValueChange={setMobileTab}
          className="flex flex-1 flex-col"
        >
          <TabsList className="w-full">
            <TabsTrigger value="pool" className="flex-1">
              <Library className="mr-1.5 h-3.5 w-3.5" />
              問題プール
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex-1">
              <LayoutList className="mr-1.5 h-3.5 w-3.5" />
              セット構成
              {totalQuestions > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {totalQuestions}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="pool"
            className="flex-1 overflow-hidden"
          >
            <QuestionPoolBrowser
              addedQuestionIds={addedQuestionIds}
              onAddQuestion={handleAddQuestion}
            />
          </TabsContent>

          <TabsContent
            value="structure"
            className="flex-1 overflow-hidden"
          >
            <SetStructureEditor
              sections={sections}
              onChange={setSections}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ========================================================================
// Set preview sub-component
// ========================================================================
function SetPreview({
  metadata,
  sections,
  totalPoints,
  totalQuestions,
}: {
  metadata: SetMetadata;
  sections: ComposedSectionItem[];
  totalPoints: number;
  totalQuestions: number;
}) {
  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-lg font-bold">
          {metadata.title || "（タイトル未設定）"}
        </h3>
        {metadata.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {metadata.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {metadata.subject && (
            <Badge variant="secondary">
              {SUBJECT_LABELS[metadata.subject as Subject] ??
                metadata.subject}
            </Badge>
          )}
          {metadata.difficulty && (
            <Badge variant="secondary">
              {DIFFICULTY_LABELS[metadata.difficulty as Difficulty] ??
                metadata.difficulty}
            </Badge>
          )}
          <Badge variant="outline">{totalQuestions}問</Badge>
          <Badge variant="outline">{totalPoints}点</Badge>
          {metadata.timeLimitMinutes && (
            <Badge variant="outline">
              {metadata.timeLimitMinutes}分
            </Badge>
          )}
          {metadata.price > 0 ? (
            <Badge>¥{metadata.price.toLocaleString("ja-JP")}</Badge>
          ) : (
            <Badge variant="secondary">無料</Badge>
          )}
        </div>
      </div>

      {/* Section previews */}
      {sections.map((section) => (
        <div key={section.id}>
          <h4 className="mb-2 text-sm font-semibold">
            {section.sectionTitle}
          </h4>
          <div className="space-y-1.5">
            {section.questions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                問題なし
              </p>
            ) : (
              section.questions.map((q, idx) => (
                <div
                  key={q.questionId}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {idx + 1}.
                  </span>
                  <p className="flex-1 text-xs line-clamp-1">
                    {q.questionText}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {q.pointsOverride ?? q.originalPoints}点
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper to convert a pool question to a composed question item
function poolQuestionToComposed(
  q: PoolQuestion
): ComposedQuestionItem {
  return {
    questionId: q.id,
    questionType: q.question_type,
    questionText: q.question_text,
    subject: q.subject,
    difficulty: q.difficulty,
    originalPoints: q.points,
    pointsOverride: null,
  };
}
