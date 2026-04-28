import { z } from "zod";
import { questionRubricSchema } from "@toinoma/shared/schemas";
import type { ProblemSetSpec, QuestionSpec } from "../types";
import { englishQuestions } from "./rubrics/english";
import { mathSciencesQuestions } from "./rubrics/math-sciences";
import { mathHumanitiesQuestions } from "./rubrics/math-humanities";
import { japaneseSciencesQuestions } from "./rubrics/japanese-sciences";
import { japaneseHumanitiesQuestions } from "./rubrics/japanese-humanities";
import { physicsQuestions } from "./rubrics/physics";
import { chemistryQuestions } from "./rubrics/chemistry";
import { biologyQuestions } from "./rubrics/biology";
import { japaneseHistoryQuestions } from "./rubrics/japanese-history";
import { worldHistoryQuestions } from "./rubrics/world-history";
import { geographyQuestions } from "./rubrics/geography";

// Title length contract per BR1 #16: count east-asian wide chars as 2 columns.
const TITLE_MAX_COLUMNS = 24;

function visualWidth(s: string): number {
  let width = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    const wide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xa000 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6);
    width += wide ? 2 : 1;
  }
  return width;
}

const titleContract = z
  .string()
  .min(1)
  .refine((s: string) => visualWidth(s) <= TITLE_MAX_COLUMNS, {
    message: `Title exceeds visual width ${TITLE_MAX_COLUMNS}`,
  });

// Difficulty distribution per TDD-4 (BR1 #12): 8 hard / 3 medium for filter testability.
export const MANIFEST: readonly ProblemSetSpec[] = [
  {
    subjectSlug: "english",
    dbSubject: "english",
    title: "東京大学 2026 英語",
    descriptionScope: "読解・要約・英作文を含む総合問題",
    difficulty: "medium",
    timeLimitMinutes: 120,
    questions: englishQuestions,
  },
  {
    subjectSlug: "math_sciences",
    dbSubject: "math",
    title: "東京大学 2026 数学(理系)",
    descriptionScope: "微分積分・複素数平面・整数論を含む",
    difficulty: "hard",
    timeLimitMinutes: 150,
    questions: mathSciencesQuestions,
  },
  {
    subjectSlug: "math_humanities",
    dbSubject: "math",
    title: "東京大学 2026 数学(文系)",
    descriptionScope: "二次関数・確率・図形と方程式を含む",
    difficulty: "medium",
    timeLimitMinutes: 100,
    questions: mathHumanitiesQuestions,
  },
  {
    subjectSlug: "japanese_sciences",
    dbSubject: "japanese",
    title: "東京大学 2026 国語(理系)",
    descriptionScope: "現代文・古文・漢文の読解",
    difficulty: "hard",
    timeLimitMinutes: 100,
    questions: japaneseSciencesQuestions,
  },
  {
    subjectSlug: "japanese_humanities",
    dbSubject: "japanese",
    title: "東京大学 2026 国語(文系)",
    descriptionScope: "現代文(評論・随想)・古文・漢文",
    difficulty: "hard",
    timeLimitMinutes: 150,
    questions: japaneseHumanitiesQuestions,
  },
  {
    subjectSlug: "physics",
    dbSubject: "physics",
    title: "東京大学 2026 物理",
    descriptionScope: "力学・電磁気・熱力学を含む",
    difficulty: "hard",
    timeLimitMinutes: 75,
    questions: physicsQuestions,
  },
  {
    subjectSlug: "chemistry",
    dbSubject: "chemistry",
    title: "東京大学 2026 化学",
    descriptionScope: "理論化学・有機化学・無機化学",
    difficulty: "hard",
    timeLimitMinutes: 75,
    questions: chemistryQuestions,
  },
  {
    subjectSlug: "biology",
    dbSubject: "biology",
    title: "東京大学 2026 生物",
    descriptionScope: "細胞分子生物学・遺伝・生態学",
    difficulty: "hard",
    timeLimitMinutes: 75,
    questions: biologyQuestions,
  },
  {
    subjectSlug: "japanese_history",
    dbSubject: "japanese_history",
    title: "東京大学 2026 日本史",
    descriptionScope: "古代から近現代までの史料論述",
    difficulty: "hard",
    timeLimitMinutes: 80,
    questions: japaneseHistoryQuestions,
  },
  {
    subjectSlug: "world_history",
    dbSubject: "world_history",
    title: "東京大学 2026 世界史",
    descriptionScope: "大論述(600字)を含む通史問題",
    difficulty: "hard",
    timeLimitMinutes: 80,
    questions: worldHistoryQuestions,
  },
  {
    subjectSlug: "geography",
    dbSubject: "geography",
    title: "東京大学 2026 地理",
    descriptionScope: "自然地理・人文地理・地誌",
    difficulty: "medium",
    timeLimitMinutes: 80,
    questions: geographyQuestions,
  },
] as const;

// Validate at module load: rubric Zod + title-length contract + ordinal uniqueness.
export function validateManifest(): void {
  const slugs = new Set<string>();
  for (const set of MANIFEST) {
    if (slugs.has(set.subjectSlug)) {
      throw new Error(`Duplicate subject_slug in manifest: ${set.subjectSlug}`);
    }
    slugs.add(set.subjectSlug);

    const titleResult = titleContract.safeParse(set.title);
    if (!titleResult.success) {
      throw new Error(
        `Title contract violated for ${set.subjectSlug}: ${titleResult.error.issues[0]?.message}`
      );
    }

    const ordinals = new Set<number>();
    for (const q of set.questions) {
      if (ordinals.has(q.ordinal)) {
        throw new Error(
          `Duplicate ordinal ${q.ordinal} in ${set.subjectSlug}`
        );
      }
      ordinals.add(q.ordinal);

      const rubricResult = questionRubricSchema.safeParse(q.rubric);
      if (!rubricResult.success) {
        throw new Error(
          `Rubric Zod validation failed for ${set.subjectSlug} q=${q.ordinal}: ` +
            `${rubricResult.error.issues
              .map((i: { path: PropertyKey[]; message: string }) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")}`
        );
      }

      const rubricPoints = q.rubric.points;
      if (rubricPoints !== q.points) {
        throw new Error(
          `Question points mismatch for ${set.subjectSlug} q=${q.ordinal}: ` +
            `spec.points=${q.points}, rubric.points=${rubricPoints}`
        );
      }
    }
  }
}

export interface ManifestSummary {
  setCount: number;
  questionCount: number;
  totalPoints: number;
  questionTypeCounts: Record<string, number>;
}

export function summarizeManifest(): ManifestSummary {
  const summary: ManifestSummary = {
    setCount: MANIFEST.length,
    questionCount: 0,
    totalPoints: 0,
    questionTypeCounts: { essay: 0, mark_sheet: 0, fill_in_blank: 0, multiple_choice: 0 },
  };
  for (const set of MANIFEST) {
    for (const q of set.questions) {
      summary.questionCount += 1;
      summary.totalPoints += q.points;
      summary.questionTypeCounts[q.questionType] =
        (summary.questionTypeCounts[q.questionType] ?? 0) + 1;
    }
  }
  return summary;
}

export type { QuestionSpec };
