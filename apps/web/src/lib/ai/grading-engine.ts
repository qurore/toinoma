import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import {
  gradingResultSchema,
  type GradingResult,
  type ProblemSetRubric,
  type QuestionRubric,
  type QuestionAnswer,
} from "@toinoma/shared/schemas";

// Deterministic grading for mark-sheet questions (FR-005)
function gradeMarkSheet(
  rubric: Extract<QuestionRubric, { type: "mark_sheet" }>,
  answer: Extract<QuestionAnswer, { type: "mark_sheet" }>
): { score: number; feedback: string; rubricMatches: GradingResult["sections"][0]["questions"][0]["rubricMatches"] } {
  const isCorrect = answer.selected === rubric.correctAnswer;

  return {
    score: isCorrect ? rubric.points : 0,
    feedback: isCorrect
      ? "正解です。"
      : `不正解です。正解は「${rubric.correctAnswer}」です。`,
    rubricMatches: [
      {
        element: `正解: ${rubric.correctAnswer}`,
        matched: isCorrect,
        pointsAwarded: isCorrect ? rubric.points : 0,
        pointsPossible: rubric.points,
        explanation: isCorrect
          ? "選択肢が正解と一致しています。"
          : `「${answer.selected}」を選択しましたが、正解は「${rubric.correctAnswer}」です。`,
      },
    ],
  };
}

// Deterministic grading for fill-in-the-blank questions (FR-007)
function gradeFillInBlank(
  rubric: Extract<QuestionRubric, { type: "fill_in_blank" }>,
  answer: Extract<QuestionAnswer, { type: "fill_in_blank" }>
): { score: number; feedback: string; rubricMatches: GradingResult["sections"][0]["questions"][0]["rubricMatches"] } {
  const normalize = (s: string) =>
    rubric.caseSensitive ? s.trim() : s.trim().toLowerCase();

  const studentAnswer = normalize(answer.text);
  const isCorrect = rubric.acceptedAnswers.some(
    (accepted) => normalize(accepted) === studentAnswer
  );

  return {
    score: isCorrect ? rubric.points : 0,
    feedback: isCorrect
      ? "正解です。"
      : `不正解です。正解は「${rubric.acceptedAnswers[0]}」です。`,
    rubricMatches: [
      {
        element: `正解: ${rubric.acceptedAnswers.join(" / ")}`,
        matched: isCorrect,
        pointsAwarded: isCorrect ? rubric.points : 0,
        pointsPossible: rubric.points,
        explanation: isCorrect
          ? "回答が正解と一致しています。"
          : `「${answer.text}」と回答しましたが、正解は「${rubric.acceptedAnswers.join("」または「")}」です。`,
      },
    ],
  };
}

// Extended result with token usage metadata
export interface GradingResultWithUsage extends GradingResult {
  tokensUsed?: number;
  costUsd?: number;
  model?: string;
}

// AI grading for essay questions (FR-004)
async function gradeEssayBatch(
  sections: Array<{
    sectionNumber: number;
    sectionPoints: number;
    questions: Array<{
      rubric: Extract<QuestionRubric, { type: "essay" }>;
      answer: Extract<QuestionAnswer, { type: "essay" }>;
    }>;
  }>
): Promise<{ result: GradingResult; tokensUsed: number }> {
  // Build rubric for AI with only essay questions
  const aiRubric = {
    sections: sections.map((s) => ({
      number: s.sectionNumber,
      points: s.sectionPoints,
      questions: s.questions.map((q) => ({
        number: q.rubric.number,
        points: q.rubric.points,
        type: "essay" as const,
        rubricElements: q.rubric.rubricElements,
        modelAnswer: q.rubric.modelAnswer,
      })),
    })),
  };

  const answers: Record<string, string> = {};
  for (const section of sections) {
    for (const q of section.questions) {
      answers[`${section.sectionNumber}-${q.rubric.number}`] =
        q.answer.text ?? "[Image submission — see attached]";
    }
  }

  const systemPrompt = `You are an expert exam grader. Grade the student's answers strictly according to the provided rubric.

Rules:
- Award partial credit where the rubric allows it
- For essay questions, check for each rubric element's presence and evaluate logical coherence
- For math questions, verify each step and check the final answer
- Be fair but strict — do not award points for vague or tangential responses
- Provide constructive feedback for each question in Japanese
- All scores must be integers

Rubric:
${JSON.stringify(aiRubric, null, 2)}`;

  const { object, usage } = await generateObject({
    model: google("gemini-2.0-flash"),
    schema: gradingResultSchema,
    system: systemPrompt,
    prompt: `Student answers:\n${JSON.stringify(answers, null, 2)}`,
  });

  const tokensUsed = (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
  return { result: object, tokensUsed };
}

// Main grading dispatch engine (FR-010)
export async function gradeSubmission({
  rubric,
  answers,
}: {
  rubric: ProblemSetRubric;
  answers: Record<string, QuestionAnswer>;
}): Promise<GradingResultWithUsage> {
  const sectionResults: GradingResult["sections"] = [];
  const essayBatchSections: Parameters<typeof gradeEssayBatch>[0] = [];

  // First pass: grade deterministic questions and collect essays
  for (const section of rubric.sections) {
    const questionResults: GradingResult["sections"][0]["questions"] = [];
    const essayQuestions: Array<{
      rubric: Extract<QuestionRubric, { type: "essay" }>;
      answer: Extract<QuestionAnswer, { type: "essay" }>;
    }> = [];

    for (const question of section.questions) {
      const answerKey = `${section.number}-${question.number}`;
      const answer = answers[answerKey];

      if (!answer) {
        // No answer provided — zero score
        questionResults.push({
          number: question.number,
          score: 0,
          maxScore: question.points,
          feedback: "未回答です。",
          rubricMatches: [],
        });
        continue;
      }

      switch (question.type) {
        case "mark_sheet": {
          if (answer.type !== "mark_sheet") break;
          const result = gradeMarkSheet(question, answer);
          questionResults.push({
            number: question.number,
            score: result.score,
            maxScore: question.points,
            feedback: result.feedback,
            rubricMatches: result.rubricMatches,
          });
          break;
        }
        case "fill_in_blank": {
          if (answer.type !== "fill_in_blank") break;
          const result = gradeFillInBlank(question, answer);
          questionResults.push({
            number: question.number,
            score: result.score,
            maxScore: question.points,
            feedback: result.feedback,
            rubricMatches: result.rubricMatches,
          });
          break;
        }
        case "essay": {
          if (answer.type !== "essay") break;
          essayQuestions.push({ rubric: question, answer });
          // Placeholder — will be filled by AI batch
          questionResults.push({
            number: question.number,
            score: 0,
            maxScore: question.points,
            feedback: "",
            rubricMatches: [],
          });
          break;
        }
      }
    }

    sectionResults.push({
      number: section.number,
      score: questionResults.reduce((sum, q) => sum + q.score, 0),
      maxScore: section.points,
      questions: questionResults,
    });

    if (essayQuestions.length > 0) {
      essayBatchSections.push({
        sectionNumber: section.number,
        sectionPoints: section.points,
        questions: essayQuestions,
      });
    }
  }

  // Second pass: AI grade essays if any
  let aiOverallFeedback: string | null = null;
  let totalTokensUsed = 0;

  if (essayBatchSections.length > 0) {
    const { result: aiResult, tokensUsed } = await gradeEssayBatch(essayBatchSections);
    totalTokensUsed = tokensUsed;
    aiOverallFeedback = aiResult.overallFeedback;

    // Merge AI results into section results
    for (const aiSection of aiResult.sections) {
      const targetSection = sectionResults.find(
        (s) => s.number === aiSection.number
      );
      if (!targetSection) continue;

      for (const aiQuestion of aiSection.questions) {
        const targetQuestion = targetSection.questions.find(
          (q) => q.number === aiQuestion.number
        );
        if (!targetQuestion) continue;

        targetQuestion.score = aiQuestion.score;
        targetQuestion.feedback = aiQuestion.feedback;
        targetQuestion.rubricMatches = aiQuestion.rubricMatches;
      }

      // Recalculate section score
      targetSection.score = targetSection.questions.reduce(
        (sum, q) => sum + q.score,
        0
      );
    }
  }

  const totalScore = sectionResults.reduce((sum, s) => sum + s.score, 0);
  const maxScore = sectionResults.reduce((sum, s) => sum + s.maxScore, 0);

  const deterministicFeedback =
    totalScore === maxScore
      ? "全問正解です。素晴らしい結果です！"
      : totalScore >= maxScore * 0.8
        ? "よくできました。いくつかの間違いを確認して、さらに理解を深めましょう。"
        : totalScore >= maxScore * 0.5
          ? "基本的な理解はできていますが、復習が必要な箇所があります。"
          : "もう一度しっかり復習して、再挑戦してみましょう。";

  // Estimate cost: Gemini 2.0 Flash ~$0.10/1M input tokens, ~$0.40/1M output tokens
  // Simplified: ~$0.15/1M total tokens
  const estimatedCostUsd = totalTokensUsed * 0.00000015;

  return {
    totalScore,
    maxScore,
    sections: sectionResults,
    overallFeedback: aiOverallFeedback ?? deterministicFeedback,
    tokensUsed: totalTokensUsed,
    costUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
    model: essayBatchSections.length > 0 ? "gemini-2.0-flash" : undefined,
  };
}
