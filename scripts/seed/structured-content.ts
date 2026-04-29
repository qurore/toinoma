/**
 * Structured-content loader for the utokyo-2026 seed.
 *
 * Each subject has an optional pre-parsed AST JSON file at
 * `scripts/seed/data/structured/<slug>.json`. When present, it is loaded
 * verbatim and inserted into `problem_sets.structured_content`.
 *
 * When absent, we synthesize a deterministic stub from the manifest entry —
 * just enough to satisfy the new schema constraints (writing-mode, lang,
 * one introductory `instruction` block, plus a `question_group` mirroring the
 * existing rubric specs). This keeps the seed lossless against the new
 * columns even before `pnpm seed:utokyo:parse` has been run.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  structuredContentSchema,
  type BlockNode,
  type StructuredContent,
  type StructuredAnswerType,
} from "@toinoma/shared/schemas";
import type { ProblemSetSpec, QuestionSpec } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STRUCTURED_DIR = join(__dirname, "data", "structured");

export interface LoadedStructuredContent {
  ast: StructuredContent;
  source: "parsed" | "stub";
  filePath: string | null;
}

export function loadStructuredContent(
  spec: ProblemSetSpec,
): LoadedStructuredContent {
  const file = join(STRUCTURED_DIR, `${spec.subjectSlug}.json`);
  if (existsSync(file)) {
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    const validated = structuredContentSchema.safeParse(parsed);
    if (!validated.success) {
      const summary = validated.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(
        `Pre-parsed AST at ${file} failed schema validation: ${summary}`,
      );
    }
    return { ast: validated.data, source: "parsed", filePath: file };
  }
  return { ast: buildStubAst(spec), source: "stub", filePath: null };
}

/**
 * Build a minimal-but-valid StructuredContent from the manifest entry.
 *
 * The stub mirrors the manifest's question specs so that downstream rendering
 * shows the section breakdown even before a real parse has been run.
 */
export function buildStubAst(spec: ProblemSetSpec): StructuredContent {
  const body: BlockNode[] = [];

  body.push({
    kind: "instruction",
    children: [
      {
        kind: "text",
        value: `${spec.title}（${spec.descriptionScope}）。各設問に答えよ。`,
      },
    ],
  });

  body.push({
    kind: "paragraph",
    children: [
      {
        kind: "text",
        value:
          "本文の構造化データはまだ取り込まれていません。元のPDFは「ソースPDFを表示」から確認できます。",
      },
    ],
  });

  for (const q of spec.questions) {
    body.push({
      kind: "section",
      number: q.sectionTitle || `第${q.ordinal}問`,
      children: [
        {
          kind: "instruction",
          children: [
            { kind: "text", value: trimToOneLine(q.questionText) || "（本文はソースPDFを参照）" },
          ],
        },
        {
          kind: "question_group",
          numbering: pickNumbering(spec, q),
          children: [
            {
              id: `q-${spec.subjectSlug}-${q.ordinal}`,
              number: q.sectionTitle || String(q.ordinal),
              prompt: [
                {
                  kind: "paragraph",
                  children: [
                    {
                      kind: "text",
                      value: trimToOneLine(q.questionText) || "（設問詳細はソースPDFを参照）",
                    },
                  ],
                },
              ],
              answerType: mapAnswerType(q.questionType),
              points: q.points,
            },
          ],
        },
      ],
    });
  }

  return {
    version: 1,
    defaultWritingMode: spec.writingMode,
    defaultLang: spec.defaultLang,
    subject: spec.dbSubject,
    university: "東京大学",
    year: 2026,
    body,
  };
}

function trimToOneLine(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function mapAnswerType(t: QuestionSpec["questionType"]): StructuredAnswerType {
  switch (t) {
    case "essay":
      return "essay";
    case "mark_sheet":
      return "multiple_choice";
    case "fill_in_blank":
      return "fill_blank";
    case "multiple_choice":
      return "multiple_choice";
  }
}

function pickNumbering(
  spec: ProblemSetSpec,
  _q: QuestionSpec,
): "kakko-kanji" | "kakko-arabic" | "A-Z" {
  if (spec.dbSubject === "japanese") return "kakko-kanji";
  if (spec.dbSubject === "math" || spec.dbSubject === "physics") return "kakko-arabic";
  return "A-Z";
}
