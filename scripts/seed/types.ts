import type {
  PassageLang,
  QuestionRubric,
  WritingMode,
} from "@toinoma/shared/schemas";
import type { AnswerType, Difficulty, Subject } from "@toinoma/shared/types";

export interface QuestionSpec {
  ordinal: number;
  sectionTitle: string;
  questionType: AnswerType;
  questionText: string;
  rubric: QuestionRubric;
  modelAnswer: string;
  topicTags: string[];
  difficulty: Difficulty;
  estimatedMinutes: number;
  points: number;
  preferredSubmissionMode?: "photo" | "text";
}

export interface ProblemSetSpec {
  subjectSlug: string;
  dbSubject: Subject;
  title: string;
  descriptionScope: string;
  difficulty: Difficulty;
  timeLimitMinutes: number;
  questions: QuestionSpec[];
  /** Default rendering mode for the structured content of this set. */
  writingMode: WritingMode;
  /** Default language hint for the structured content of this set. */
  defaultLang: PassageLang;
}
