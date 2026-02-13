"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnswerForm } from "./answer-form";
import { GradingResultDisplay } from "./grading-result";
import type { ProblemSetRubric, QuestionAnswer, GradingResult } from "@toinoma/shared/schemas";

export function SolveClient({
  problemSetId,
  rubric,
}: {
  problemSetId: string;
  rubric: ProblemSetRubric;
}) {
  const router = useRouter();
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (answers: Record<string, QuestionAnswer>) => {
    setError(null);

    const res = await fetch("/api/grading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemSetId, answers }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "採点に失敗しました");
      return;
    }

    setResult(data.result);

    // Navigate to result page
    if (data.submissionId) {
      router.push(`/problem/${problemSetId}/result/${data.submissionId}`);
    }
  };

  if (result) {
    return <GradingResultDisplay result={result} />;
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <AnswerForm
        rubric={rubric}
        problemSetId={problemSetId}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
