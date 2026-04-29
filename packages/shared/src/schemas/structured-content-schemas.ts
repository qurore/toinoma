/**
 * Structured-content AST: the canonical representation of an exam problem.
 *
 * Designed to round-trip every observed UTokyo 2026 pattern: vertical/horizontal Japanese,
 * kanbun with kunten, classical Japanese with furigana, math (LaTeX), figures, tables,
 * fill-in blanks, multiple choice, footnotes, citations, and English passages.
 *
 * Producer: parser pipeline (PDF/DOCX → AST) + manual editor (Tiptap → AST).
 * Consumer: StructuredContentView renderer + grading engine.
 */
import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Shared enums
// ─────────────────────────────────────────────────────────────

export const numberingStyleSchema = z.enum([
  "kakko-kanji", // (一)(二)(三)
  "kakko-arabic", // (1)(2)(3)
  "A-Z", // A B C
  "a-z", // a b c
  "maru-kanji", // ①②③
  "roman-upper", // I II III
]);
export type NumberingStyle = z.infer<typeof numberingStyleSchema>;

export const writingModeSchema = z.enum(["horizontal", "vertical"]);
export type WritingMode = z.infer<typeof writingModeSchema>;

export const passageLangSchema = z.enum([
  "ja-modern",
  "ja-classical",
  "kanbun",
  "en",
  "mixed",
]);
export type PassageLang = z.infer<typeof passageLangSchema>;

export const answerTypeSchema = z.enum([
  "essay",
  "short_answer",
  "multiple_choice",
  "fill_blank",
  "rearrange",
  "translation",
  "kanji_write",
  "classical_translation",
  "kanbun_translation",
  "photo_upload",
  "math_proof",
  "math_compute",
]);
export type StructuredAnswerType = z.infer<typeof answerTypeSchema>;

// ─────────────────────────────────────────────────────────────
// Inline nodes — recursive
// ─────────────────────────────────────────────────────────────

// Forward declaration via lazy
export interface InlineText {
  kind: "text";
  value: string;
}
export interface InlineRuby {
  kind: "ruby";
  base: string;
  reading: string;
}
export interface InlineEm {
  kind: "em";
  children: InlineNode[];
}
export interface InlineStrong {
  kind: "strong";
  children: InlineNode[];
}
export interface InlineKakko {
  kind: "kakko";
  style: "「」" | "『』" | "（）" | "［］" | "【】";
  children: InlineNode[];
}
export interface InlineUnderline {
  kind: "underline";
  marker?: string; // 傍線部 ア/イ/ウ; absent for plain underline
  children: InlineNode[];
}
export interface InlineBlank {
  kind: "blank";
  id: string;
  label?: string; // visible "(1)" or "[ア]"
  width?: "auto" | "short" | "medium" | "long";
}
export interface InlineMath {
  kind: "math_inline";
  latex: string;
  confidence?: "high" | "low" | "image_fallback";
}
export interface InlineRef {
  kind: "ref";
  refType: "figure" | "table" | "footnote" | "passage" | "question" | "marker";
  target: string; // label like "図1-1" or marker "ア"
}
export interface InlineForeign {
  kind: "foreign";
  lang: string; // BCP-47 e.g. "de", "fr", "la"
  value: string;
  reading?: string;
}
export interface InlineLineBreak {
  kind: "linebreak";
}

export type InlineNode =
  | InlineText
  | InlineRuby
  | InlineEm
  | InlineStrong
  | InlineKakko
  | InlineUnderline
  | InlineBlank
  | InlineMath
  | InlineRef
  | InlineForeign
  | InlineLineBreak;

const inlineNodeSchema: z.ZodType<InlineNode> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("text"), value: z.string() }),
    z.object({
      kind: z.literal("ruby"),
      base: z.string().min(1),
      reading: z.string().min(1),
    }),
    z.object({
      kind: z.literal("em"),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      kind: z.literal("strong"),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      kind: z.literal("kakko"),
      style: z.enum(["「」", "『』", "（）", "［］", "【】"]),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      kind: z.literal("underline"),
      marker: z.string().optional(),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      kind: z.literal("blank"),
      id: z.string().min(1),
      label: z.string().optional(),
      width: z.enum(["auto", "short", "medium", "long"]).optional(),
    }),
    z.object({
      kind: z.literal("math_inline"),
      latex: z.string().min(1),
      confidence: z.enum(["high", "low", "image_fallback"]).optional(),
    }),
    z.object({
      kind: z.literal("ref"),
      refType: z.enum([
        "figure",
        "table",
        "footnote",
        "passage",
        "question",
        "marker",
      ]),
      target: z.string().min(1),
    }),
    z.object({
      kind: z.literal("foreign"),
      lang: z.string().min(2),
      value: z.string().min(1),
      reading: z.string().optional(),
    }),
    z.object({ kind: z.literal("linebreak") }),
  ]),
);

// ─────────────────────────────────────────────────────────────
// Kanbun token & line
// ─────────────────────────────────────────────────────────────

export const kaeritenSchema = z.enum([
  "レ", // re-mark (read previous)
  "一",
  "二",
  "三",
  "四",
  "上",
  "中",
  "下",
  "甲",
  "乙",
  "丙",
  "天",
  "地",
  "人",
]);
export type Kaeriten = z.infer<typeof kaeritenSchema>;

export const kanbunTokenSchema = z.object({
  char: z.string().min(1), // single CJK char or punctuation
  okurigana: z.string().optional(), // katakana sent, e.g. "ル", "シテ"
  kaeriten: kaeritenSchema.optional(),
  ruby: z.string().optional(), // furigana on this char
});
export type KanbunToken = z.infer<typeof kanbunTokenSchema>;

export const kanbunLineSchema = z.object({
  tokens: z.array(kanbunTokenSchema).min(1),
  indent: z.number().int().min(0).optional(),
});
export type KanbunLine = z.infer<typeof kanbunLineSchema>;

// ─────────────────────────────────────────────────────────────
// Block nodes
// ─────────────────────────────────────────────────────────────

export interface BlockSection {
  kind: "section";
  number: string; // "第1問" or "第一問"
  title?: InlineNode[];
  children: BlockNode[];
}
export interface BlockSubsection {
  kind: "subsection";
  marker: string; // "I" / "A" / "1"
  children: BlockNode[];
}
export interface BlockPassage {
  kind: "passage";
  vertical: boolean;
  lang: PassageLang;
  source?: InlineNode[]; // citation line "（松本卓也『〜』による）"
  children: BlockNode[];
}
export interface BlockInstruction {
  kind: "instruction";
  children: InlineNode[];
}
export interface BlockParagraph {
  kind: "paragraph";
  align?: "start" | "center" | "end";
  indent?: number;
  children: InlineNode[];
}
export interface BlockKanbun {
  kind: "kanbun_block";
  lines: KanbunLine[];
}
export interface BlockMathDisplay {
  kind: "math_display";
  latex: string;
  numbered?: boolean;
  confidence?: "high" | "low" | "image_fallback";
}
export interface BlockFigure {
  kind: "figure";
  assetId: string;
  label: string; // "図1-1"
  caption?: InlineNode[];
}
export interface TableCellSpec {
  children: InlineNode[];
  rowspan?: number;
  colspan?: number;
  header?: boolean;
  align?: "start" | "center" | "end";
}
export interface BlockTable {
  kind: "table";
  label: string; // "表1-1"
  caption?: InlineNode[];
  rows: TableCellSpec[][];
  // Some bio/chem tables include diagrams in cells. assetIds attaches them.
  embeddedAssetIds?: string[];
}
export interface BlockChoices {
  kind: "choices";
  style: NumberingStyle;
  options: { id: string; children: InlineNode[] }[];
}
export interface BlockRearrange {
  kind: "rearrange";
  tokens: string[];
}
export interface BlockAudio {
  kind: "audio";
  assetId: string;
  transcript?: InlineNode[];
}
export interface BlockFootnoteSection {
  kind: "footnote_section";
  items: { ref: string; children: InlineNode[] }[];
}
export interface BlockCitation {
  kind: "citation";
  children: InlineNode[];
}
export interface BlockSpacer {
  kind: "spacer";
  lines: number;
}
export interface BlockQuestionGroup {
  kind: "question_group";
  numbering: NumberingStyle;
  children: Question[];
}

export interface QuestionConstraint {
  kind: "chars" | "words" | "lines";
  max?: number;
  min?: number;
}

export interface Question {
  id: string;
  number: string; // "(一)" or "A"
  prompt: BlockNode[];
  answerType: StructuredAnswerType;
  refs?: string[]; // referenced markers/figures
  constraint?: QuestionConstraint;
  choices?: { id: string; label?: string; text?: InlineNode[] }[];
  blanks?: { id: string; label?: string }[];
  points?: number;
}

export type BlockNode =
  | BlockSection
  | BlockSubsection
  | BlockPassage
  | BlockInstruction
  | BlockParagraph
  | BlockKanbun
  | BlockMathDisplay
  | BlockFigure
  | BlockTable
  | BlockChoices
  | BlockRearrange
  | BlockAudio
  | BlockFootnoteSection
  | BlockCitation
  | BlockSpacer
  | BlockQuestionGroup;

const tableCellSchema: z.ZodType<TableCellSpec> = z.lazy(() =>
  z.object({
    children: z.array(inlineNodeSchema),
    rowspan: z.number().int().positive().optional(),
    colspan: z.number().int().positive().optional(),
    header: z.boolean().optional(),
    align: z.enum(["start", "center", "end"]).optional(),
  }),
);

const questionConstraintSchema: z.ZodType<QuestionConstraint> = z.object({
  kind: z.enum(["chars", "words", "lines"]),
  max: z.number().int().positive().optional(),
  min: z.number().int().positive().optional(),
});

const questionSchema: z.ZodType<Question> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    number: z.string().min(1),
    prompt: z.array(blockNodeSchema),
    answerType: answerTypeSchema,
    refs: z.array(z.string()).optional(),
    constraint: questionConstraintSchema.optional(),
    choices: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().optional(),
          text: z.array(inlineNodeSchema).optional(),
        }),
      )
      .optional(),
    blanks: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().optional(),
        }),
      )
      .optional(),
    points: z.number().min(0).optional(),
  }),
);

const blockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("section"),
      number: z.string().min(1),
      title: z.array(inlineNodeSchema).optional(),
      children: z.array(blockNodeSchema),
    }),
    z.object({
      kind: z.literal("subsection"),
      marker: z.string().min(1),
      children: z.array(blockNodeSchema),
    }),
    z.object({
      kind: z.literal("passage"),
      vertical: z.boolean(),
      lang: passageLangSchema,
      source: z.array(inlineNodeSchema).optional(),
      children: z.array(blockNodeSchema),
    }),
    z.object({
      kind: z.literal("instruction"),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      kind: z.literal("paragraph"),
      align: z.enum(["start", "center", "end"]).optional(),
      indent: z.number().int().min(0).optional(),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      kind: z.literal("kanbun_block"),
      lines: z.array(kanbunLineSchema).min(1),
    }),
    z.object({
      kind: z.literal("math_display"),
      latex: z.string().min(1),
      numbered: z.boolean().optional(),
      confidence: z.enum(["high", "low", "image_fallback"]).optional(),
    }),
    z.object({
      kind: z.literal("figure"),
      assetId: z.string().min(1),
      label: z.string().min(1),
      caption: z.array(inlineNodeSchema).optional(),
    }),
    z.object({
      kind: z.literal("table"),
      label: z.string().min(1),
      caption: z.array(inlineNodeSchema).optional(),
      rows: z.array(z.array(tableCellSchema)).min(1),
      embeddedAssetIds: z.array(z.string()).optional(),
    }),
    z.object({
      kind: z.literal("choices"),
      style: numberingStyleSchema,
      options: z.array(
        z.object({
          id: z.string().min(1),
          children: z.array(inlineNodeSchema),
        }),
      ),
    }),
    z.object({
      kind: z.literal("rearrange"),
      tokens: z.array(z.string().min(1)).min(2),
    }),
    z.object({
      kind: z.literal("audio"),
      assetId: z.string().min(1),
      transcript: z.array(inlineNodeSchema).optional(),
    }),
    z.object({
      kind: z.literal("footnote_section"),
      items: z.array(
        z.object({
          ref: z.string().min(1),
          children: z.array(inlineNodeSchema),
        }),
      ),
    }),
    z.object({
      kind: z.literal("citation"),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      kind: z.literal("spacer"),
      lines: z.number().int().positive(),
    }),
    z.object({
      kind: z.literal("question_group"),
      numbering: numberingStyleSchema,
      children: z.array(questionSchema),
    }),
  ]),
);

// ─────────────────────────────────────────────────────────────
// Root document
// ─────────────────────────────────────────────────────────────

export interface StructuredContent {
  version: 1;
  defaultWritingMode: WritingMode;
  defaultLang: PassageLang;
  subject?: string;
  university?: string;
  year?: number;
  body: BlockNode[];
}

export const structuredContentSchema = z.object({
  version: z.literal(1),
  defaultWritingMode: writingModeSchema,
  defaultLang: passageLangSchema,
  subject: z.string().optional(),
  university: z.string().optional(),
  year: z.number().int().positive().optional(),
  body: z.array(blockNodeSchema),
});

export const inlineNodeSchemaExport = inlineNodeSchema;
export const blockNodeSchemaExport = blockNodeSchema;
export const questionSchemaExport = questionSchema;

export {
  inlineNodeSchema as INLINE_NODE_SCHEMA,
  blockNodeSchema as BLOCK_NODE_SCHEMA,
  questionSchema as QUESTION_SCHEMA,
};
