/**
 * Server component that renders a single question in print format.
 * Handles all 4 question types (essay, mark_sheet, fill_in_blank, multiple_choice)
 * with appropriate layouts for problems vs. answers modes.
 *
 * In "problems" mode: shows empty answer areas (lined boxes, empty bubbles, blanks).
 * In "answers" mode: shows filled-in correct answers / model answers.
 * In "combined" mode: shows question text + model answers together.
 */

import type { Database, AnswerType, Json } from "@/types/database";

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

type PrintMode = "problems" | "answers" | "combined";

interface PrintQuestionProps {
  question: QuestionRow;
  sectionNumber: number;
  position: number;
  pointsOverride: number | null;
  mode: PrintMode;
}

// Number of lined rows to show in the essay writing area
const ESSAY_LINE_COUNT = 10;

// Number of lines in vertical essay writing area
const VERTICAL_ESSAY_LINE_COUNT = 8;

export function PrintQuestion({
  question,
  sectionNumber,
  position,
  pointsOverride,
  mode,
}: PrintQuestionProps) {
  const points = pointsOverride ?? question.points;
  const showQuestionText = mode === "problems" || mode === "combined";
  const showAnswer = mode === "answers" || mode === "combined";
  const isVertical = question.vertical_text;

  return (
    <div className={`print-question ${isVertical ? "print-vertical" : ""}`}>
      {/* Question number and points */}
      <div className="print-question-number">
        {formatQuestionNumber(sectionNumber, position)}
        <span className="print-question-points">
          ({points}点)
        </span>
      </div>

      {/* Question text */}
      {showQuestionText && question.question_text && (
        <div className="print-question-text">{question.question_text}</div>
      )}

      {/* Question images */}
      {showQuestionText && hasImages(question.question_images) && (
        <div style={{ marginBottom: "10pt" }}>
          {getImageUrls(question.question_images).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`問題画像 ${i + 1}`}
              style={{
                maxWidth: "100%",
                maxHeight: "200pt",
                marginBottom: "6pt",
              }}
            />
          ))}
        </div>
      )}

      {/* Type-specific rendering */}
      {question.question_type === "essay" && (
        <EssaySection
          question={question}
          mode={mode}
          showAnswer={showAnswer}
          isVertical={isVertical}
        />
      )}

      {question.question_type === "mark_sheet" && (
        <MarkSheetSection
          question={question}
          showAnswer={showAnswer}
        />
      )}

      {question.question_type === "fill_in_blank" && (
        <FillInBlankSection
          question={question}
          showAnswer={showAnswer}
        />
      )}

      {question.question_type === "multiple_choice" && (
        <MultipleChoiceSection
          question={question}
          showAnswer={showAnswer}
        />
      )}
    </div>
  );
}

// --- Sub-components for each question type ---

function EssaySection({
  question,
  mode,
  showAnswer,
  isVertical,
}: {
  question: QuestionRow;
  mode: PrintMode;
  showAnswer: boolean;
  isVertical: boolean;
}) {
  const lineCount = isVertical ? VERTICAL_ESSAY_LINE_COUNT : ESSAY_LINE_COUNT;

  if (mode === "problems") {
    // Show empty lined writing area
    return (
      <div className="print-essay-lines">
        {Array.from({ length: lineCount }).map((_, i) => (
          <div key={i} className="print-essay-line" />
        ))}
      </div>
    );
  }

  // "answers" or "combined" mode: show model answer
  if (showAnswer && question.model_answer) {
    return (
      <div>
        <div className="print-model-answer-label">模範解答</div>
        <div className="print-model-answer">{question.model_answer}</div>
        {hasImages(question.model_answer_images) && (
          <div style={{ marginTop: "6pt" }}>
            {getImageUrls(question.model_answer_images).map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`模範解答画像 ${i + 1}`}
                style={{
                  maxWidth: "100%",
                  maxHeight: "150pt",
                  marginBottom: "4pt",
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // No model answer available
  if (showAnswer) {
    return (
      <div className="print-model-answer" style={{ color: "#999" }}>
        模範解答は設定されていません
      </div>
    );
  }

  return null;
}

function MarkSheetSection({
  question,
  showAnswer,
}: {
  question: QuestionRow;
  showAnswer: boolean;
}) {
  const rubric = question.rubric as Record<string, unknown> | null;
  const choices = extractChoices(rubric);
  const correctAnswer = extractCorrectAnswer(rubric);

  return (
    <div className="print-bubble-grid">
      {choices.map((choice) => {
        const isFilled = showAnswer && choice === correctAnswer;
        return (
          <div key={choice} className="print-bubble">
            <div
              className={`print-bubble-circle ${isFilled ? "print-bubble-filled" : ""}`}
            />
            <span>{choice}</span>
          </div>
        );
      })}
    </div>
  );
}

function FillInBlankSection({
  question,
  showAnswer,
}: {
  question: QuestionRow;
  showAnswer: boolean;
}) {
  const rubric = question.rubric as Record<string, unknown> | null;
  const acceptedAnswers = extractAcceptedAnswers(rubric);

  if (showAnswer && acceptedAnswers.length > 0) {
    return (
      <div>
        <div className="print-model-answer-label">正解</div>
        <div style={{ marginTop: "4pt" }}>
          {acceptedAnswers.map((answer, i) => (
            <span key={i} className="print-blank-answer">
              {answer}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Problems mode: show blank underline
  return (
    <div style={{ marginTop: "6pt" }}>
      <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: "10pt" }}>
        解答：
      </span>
      <span className="print-blank-box" />
    </div>
  );
}

function MultipleChoiceSection({
  question,
  showAnswer,
}: {
  question: QuestionRow;
  showAnswer: boolean;
}) {
  const rubric = question.rubric as Record<string, unknown> | null;
  const options = extractMultipleChoiceOptions(rubric);
  const correctIds = extractCorrectOptionIds(rubric);

  return (
    <ul className="print-option-list">
      {options.map((option) => {
        const isCorrect = showAnswer && correctIds.includes(option.id);
        return (
          <li key={option.id} className="print-option-item">
            <div
              className={`print-option-marker ${isCorrect ? "print-option-marker-checked" : ""}`}
            />
            <span>{option.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

// --- Helper functions ---

/**
 * Format question number in Japanese exam style: "第1問 (1)"
 */
function formatQuestionNumber(sectionNumber: number, position: number): string {
  return `第${sectionNumber}問 (${position})`;
}

/**
 * Check if the images JSON field has actual image URLs.
 */
function hasImages(images: Json): boolean {
  if (!images) return false;
  if (Array.isArray(images)) return images.length > 0;
  return false;
}

/**
 * Extract image URL strings from the JSON field.
 */
function getImageUrls(images: Json): string[] {
  if (!images || !Array.isArray(images)) return [];
  return images.filter((img): img is string => typeof img === "string");
}

/**
 * Extract choices array from mark_sheet rubric JSON.
 * Falls back to standard A-E choices.
 */
function extractChoices(rubric: Record<string, unknown> | null): string[] {
  if (!rubric) return ["ア", "イ", "ウ", "エ"];
  if (Array.isArray(rubric.choices) && rubric.choices.length > 0) {
    return rubric.choices.filter((c): c is string => typeof c === "string");
  }
  return ["ア", "イ", "ウ", "エ"];
}

/**
 * Extract the correct answer from mark_sheet rubric JSON.
 */
function extractCorrectAnswer(rubric: Record<string, unknown> | null): string {
  if (!rubric) return "";
  if (typeof rubric.correctAnswer === "string") return rubric.correctAnswer;
  return "";
}

/**
 * Extract accepted answers from fill_in_blank rubric JSON.
 */
function extractAcceptedAnswers(rubric: Record<string, unknown> | null): string[] {
  if (!rubric) return [];
  if (Array.isArray(rubric.acceptedAnswers)) {
    return rubric.acceptedAnswers.filter((a): a is string => typeof a === "string");
  }
  return [];
}

/**
 * Extract multiple choice options from rubric JSON.
 */
function extractMultipleChoiceOptions(
  rubric: Record<string, unknown> | null
): Array<{ id: string; text: string }> {
  if (!rubric) return [];
  if (Array.isArray(rubric.options)) {
    return rubric.options
      .filter(
        (o): o is { id: string; text: string } =>
          typeof o === "object" &&
          o !== null &&
          typeof (o as Record<string, unknown>).id === "string" &&
          typeof (o as Record<string, unknown>).text === "string"
      )
      .map((o) => ({ id: o.id, text: o.text }));
  }
  return [];
}

/**
 * Extract correct option IDs from multiple choice rubric JSON.
 */
function extractCorrectOptionIds(rubric: Record<string, unknown> | null): string[] {
  if (!rubric) return [];
  if (Array.isArray(rubric.correct_option_ids)) {
    return rubric.correct_option_ids.filter((id): id is string => typeof id === "string");
  }
  return [];
}
