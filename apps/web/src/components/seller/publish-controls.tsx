"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Globe,
  EyeOff,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  publishProblemSet,
  unpublishProblemSet,
  deleteProblemSet,
} from "@/app/(seller)/sell/actions";
import { createClient } from "@/lib/supabase/client";

interface ValidationCheck {
  label: string;
  passed: boolean;
  required: boolean;
}

export function PublishControls({
  problemSetId,
  currentStatus,
  price,
}: {
  problemSetId: string;
  currentStatus: string;
  /** Price in yen, used to check if Stripe onboarding is required */
  price?: number;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attested, setAttested] = useState(false);
  const [checks, setChecks] = useState<ValidationCheck[]>([]);
  const [isValidating, setIsValidating] = useState(true);

  const runValidation = useCallback(async () => {
    setIsValidating(true);

    try {
      const supabase = createClient();

      // Fetch problem set data
      const { data: ps } = await supabase
        .from("problem_sets")
        .select("title, subject, total_points, rubric, problem_pdf_url")
        .eq("id", problemSetId)
        .single();

      // Fetch linked questions
      const { data: linkedQuestions } = await supabase
        .from("problem_set_questions")
        .select("question_id")
        .eq("problem_set_id", problemSetId);

      // Check if linked questions have rubrics
      let allQuestionsHaveRubrics = true;
      if (linkedQuestions && linkedQuestions.length > 0) {
        const questionIds = linkedQuestions.map((lq) => lq.question_id);
        const { data: questions } = await supabase
          .from("questions")
          .select("id, rubric")
          .in("id", questionIds);

        if (questions) {
          allQuestionsHaveRubrics = questions.every(
            (q) => q.rubric !== null && q.rubric !== undefined
          );
        }
      }

      // Check Stripe onboarding if price > 0
      let stripeOnboarded = true;
      const effectivePrice = price ?? ps?.total_points ?? 0;
      if (effectivePrice > 0) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: sellerProfile } = await supabase
            .from("seller_profiles")
            .select("stripe_account_id")
            .eq("id", userData.user.id)
            .single();

          stripeOnboarded = !!sellerProfile?.stripe_account_id;
        }
      }

      const questionCount = linkedQuestions?.length ?? 0;

      const validationChecks: ValidationCheck[] = [
        {
          label: "タイトルが入力されている",
          passed: !!ps?.title?.trim(),
          required: true,
        },
        {
          label: "教科が選択されている",
          passed: !!ps?.subject,
          required: true,
        },
        {
          label: "問題が1つ以上追加されている",
          passed: questionCount > 0,
          required: true,
        },
        {
          label: "すべての問題にルーブリックが設定されている",
          passed: questionCount > 0 && allQuestionsHaveRubrics,
          required: true,
        },
        {
          label: "合計配点が0点より大きい",
          passed: (ps?.total_points ?? 0) > 0,
          required: true,
        },
        ...(effectivePrice > 0
          ? [
              {
                label: "Stripe決済が設定されている（有料の場合必須）",
                passed: stripeOnboarded,
                required: true,
              },
            ]
          : []),
      ];

      setChecks(validationChecks);
    } finally {
      setIsValidating(false);
    }
  }, [problemSetId, price]);

  useEffect(() => {
    if (currentStatus !== "published") {
      runValidation();
    } else {
      setIsValidating(false);
    }
  }, [currentStatus, runValidation]);

  const allRequiredPassed = checks
    .filter((c) => c.required)
    .every((c) => c.passed);

  const canPublish = allRequiredPassed && attested && !isValidating;

  const handlePublish = async () => {
    if (!canPublish) return;
    setIsLoading(true);
    setError(null);
    const result = await publishProblemSet(problemSetId, true);
    setIsLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  const handleUnpublish = async () => {
    setIsLoading(true);
    setError(null);
    const result = await unpublishProblemSet(problemSetId);
    setIsLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm("この問題セットを削除しますか？この操作は取り消せません。")) {
      return;
    }
    setIsLoading(true);
    setError(null);
    const result = await deleteProblemSet(problemSetId);
    if (result?.error) {
      setIsLoading(false);
      setError(result.error);
    }
    // deleteProblemSet redirects on success
  };

  const isPublished = currentStatus === "published";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">公開設定</CardTitle>
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? "公開中" : "下書き"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Validation checklist — only show when in draft */}
        {!isPublished && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  公開前チェック
                </span>
              </div>
              {!allRequiredPassed && !isValidating && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={runValidation}
                  className="h-7 text-xs"
                >
                  再検証
                </Button>
              )}
            </div>

            {isValidating ? (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                検証中...
              </div>
            ) : (
              <ul className="space-y-1">
                {checks.map((check) => (
                  <li
                    key={check.label}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span
                      className={
                        check.passed
                          ? "text-muted-foreground"
                          : "text-foreground"
                      }
                    >
                      {check.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* FR-017: Originality attestation — only show when publishing */}
        {!isPublished && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
            <input
              type="checkbox"
              id={`attest-${problemSetId}`}
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <Label
              htmlFor={`attest-${problemSetId}`}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              この問題セットは自分（またはサークル）が作成したオリジナルの問題であり、
              既存の入試問題をそのまま複製したものではないことを確認します。
              問題の著作権は出題者に帰属し、利用規約に従って販売されます。
            </Label>
          </div>
        )}

        <div className="flex items-center gap-3">
          {isPublished ? (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <EyeOff className="mr-2 h-4 w-4" />
              )}
              非公開にする
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePublish}
                disabled={isLoading || !canPublish}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                公開する
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                削除
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
