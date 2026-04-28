import type { QuestionRubric } from "@toinoma/shared/schemas";
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
}
