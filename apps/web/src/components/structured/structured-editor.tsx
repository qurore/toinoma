/**
 * StructuredEditor — direct AST manipulation editor.
 *
 * Rather than introducing Tiptap (and a bidirectional bridge), this editor binds
 * directly to the StructuredContent AST: a tree-of-blocks panel on the left, a
 * detail editor for the focused node on the right, and a live preview.
 *
 * This avoids serialization mismatches and surfaces the exact node shape to the
 * creator, which is exactly the level of control needed for exam content.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type StructuredContent,
  type BlockNode,
  type InlineNode,
  type Question,
  structuredContentSchema,
} from "@toinoma/shared/schemas";
import { StructuredContentView, type AssetMap } from "./structured-content-view";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown, FileText, Eye, EyeOff } from "lucide-react";

interface Props {
  initial: StructuredContent;
  assets?: AssetMap;
  onChange?: (next: StructuredContent) => void;
  onSave?: (next: StructuredContent) => Promise<void> | void;
  saving?: boolean;
}

type Path = number[];

export function StructuredEditor({
  initial,
  assets,
  onChange,
  onSave,
  saving = false,
}: Props) {
  const [content, setContent] = useState<StructuredContent>(initial);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = useCallback(
    (next: StructuredContent) => {
      const parse = structuredContentSchema.safeParse(next);
      setValidationError(
        parse.success ? null : firstIssue(zodIssuesToPlain(parse.error.issues)),
      );
      setContent(next);
      onChange?.(next);
    },
    [onChange],
  );

  const moveBlock = useCallback(
    (idx: number, dir: -1 | 1) => {
      const j = idx + dir;
      if (j < 0 || j >= content.body.length) return;
      const body = [...content.body];
      [body[idx], body[j]] = [body[j]!, body[idx]!];
      update({ ...content, body });
    },
    [content, update],
  );

  const removeBlock = useCallback(
    (idx: number) => {
      const body = content.body.filter((_, i) => i !== idx);
      update({ ...content, body });
      setSelectedPath(null);
    },
    [content, update],
  );

  const insertBlock = useCallback(
    (block: BlockNode, after?: number) => {
      const idx = after === undefined ? content.body.length : after + 1;
      const body = [
        ...content.body.slice(0, idx),
        block,
        ...content.body.slice(idx),
      ];
      update({ ...content, body });
      setSelectedPath([idx]);
    },
    [content, update],
  );

  const updateBlockAt = useCallback(
    (idx: number, mut: (b: BlockNode) => BlockNode) => {
      const body = content.body.map((b, i) => (i === idx ? mut(b) : b));
      update({ ...content, body });
    },
    [content, update],
  );

  const handleSave = useCallback(async () => {
    const parse = structuredContentSchema.safeParse(content);
    if (!parse.success) {
      setValidationError(firstIssue(zodIssuesToPlain(parse.error.issues)));
      return;
    }
    await onSave?.(parse.data);
  }, [content, onSave]);

  // ⌘S / Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const selectedBlock =
    selectedPath && selectedPath.length === 1
      ? content.body[selectedPath[0]!]
      : undefined;
  const selectedIdx = selectedPath?.[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-[80vh]">
      {/* Left: outline */}
      <div className="xl:col-span-3 border rounded-lg p-3 bg-card overflow-y-auto max-h-[80vh]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">構成</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((s) => !s)}
              title={showPreview ? "プレビューを隠す" : "プレビューを表示"}
            >
              {showPreview ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <ol className="space-y-1 text-sm">
          {content.body.map((b, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setSelectedPath([i])}
                className={`w-full text-start px-2 py-1.5 rounded hover:bg-foreground/5 ${
                  selectedIdx === i ? "bg-primary/10 text-primary font-medium" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-foreground/10 font-mono">
                    {b.kind}
                  </span>
                  <span className="truncate">{blockSummary(b)}</span>
                </div>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-3 grid grid-cols-2 gap-1">
          <BlockInsertMenu onInsert={(b) => insertBlock(b, selectedIdx)} />
        </div>
      </div>

      {/* Middle: detail editor */}
      <div className="xl:col-span-5 border rounded-lg p-4 bg-card overflow-y-auto max-h-[80vh]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">詳細編集</h3>
          {validationError && (
            <span className="text-xs text-red-700">⚠ {validationError}</span>
          )}
        </div>
        {!selectedBlock || selectedIdx === undefined ? (
          <p className="text-sm text-foreground/60">
            左の構成からブロックを選択してください
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveBlock(selectedIdx, -1)}
                disabled={selectedIdx === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveBlock(selectedIdx, 1)}
                disabled={selectedIdx === content.body.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeBlock(selectedIdx)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="ms-1">削除</span>
              </Button>
            </div>

            <BlockDetailForm
              block={selectedBlock}
              onChange={(next) => updateBlockAt(selectedIdx, () => next)}
            />
          </div>
        )}

        <div className="mt-6 pt-3 border-t flex justify-end">
          <Button onClick={handleSave} disabled={saving || !!validationError}>
            <FileText className="h-4 w-4 me-2" />
            <span>保存</span>
          </Button>
        </div>
      </div>

      {/* Right: preview */}
      {showPreview && (
        <div className="xl:col-span-4 border rounded-lg p-4 bg-background overflow-y-auto max-h-[80vh]">
          <h3 className="font-bold mb-3">プレビュー</h3>
          <StructuredContentView
            content={content}
            assets={assets}
            inert
          />
        </div>
      )}
    </div>
  );
}

function firstIssue(issues: { path: (string | number)[]; message: string }[]): string {
  const i = issues[0];
  if (!i) return "Unknown error";
  return `${i.path.join(".") || "(root)"}: ${i.message}`;
}

function zodIssuesToPlain(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): { path: (string | number)[]; message: string }[] {
  return issues.map((i) => ({
    path: i.path.map((p) => (typeof p === "symbol" ? String(p) : p)) as (
      | string
      | number
    )[],
    message: i.message,
  }));
}

function blockSummary(b: BlockNode): string {
  switch (b.kind) {
    case "section":
      return `${b.number}`;
    case "subsection":
      return `${b.marker}`;
    case "passage":
      return b.vertical ? `本文 (縦書き / ${b.lang})` : `本文 (${b.lang})`;
    case "instruction":
      return inlinePreview(b.children, 24);
    case "paragraph":
      return inlinePreview(b.children, 32);
    case "kanbun_block":
      return `漢文 (${b.lines.length}行)`;
    case "math_display":
      return `数式: ${b.latex.slice(0, 24)}`;
    case "figure":
      return `${b.label}`;
    case "table":
      return `${b.label} (${b.rows.length}行)`;
    case "choices":
      return `選択肢 (${b.options.length})`;
    case "rearrange":
      return `並べ替え (${b.tokens.length})`;
    case "audio":
      return "音声";
    case "footnote_section":
      return `注 (${b.items.length})`;
    case "citation":
      return inlinePreview(b.children, 24);
    case "spacer":
      return `間隔 (${b.lines})`;
    case "question_group":
      return `設問 (${b.children.length}問)`;
  }
}

function inlinePreview(nodes: InlineNode[], max: number): string {
  let out = "";
  for (const n of nodes) {
    if (n.kind === "text") out += n.value;
    else if (n.kind === "ruby") out += n.base;
    else if (n.kind === "foreign") out += n.value;
    else if ("children" in n && Array.isArray(n.children))
      out += inlinePreview(n.children, max);
    if (out.length >= max) break;
  }
  return out.slice(0, max) + (out.length >= max ? "…" : "");
}

// ─────────────────────────────────────────────────────────────
// Block detail form
// ─────────────────────────────────────────────────────────────

function BlockDetailForm({
  block,
  onChange,
}: {
  block: BlockNode;
  onChange: (next: BlockNode) => void;
}) {
  switch (block.kind) {
    case "paragraph":
    case "instruction":
    case "citation":
      return (
        <InlineChildrenEditor
          label={block.kind === "paragraph" ? "段落" : block.kind === "instruction" ? "指示文" : "出典"}
          value={block.children}
          onChange={(children) => onChange({ ...block, children })}
        />
      );
    case "section":
      return (
        <div className="space-y-3">
          <LabeledInput
            label="番号"
            value={block.number}
            onChange={(number) => onChange({ ...block, number })}
          />
          <p className="text-xs text-foreground/60">
            セクションの子ブロックは現状直接編集には対応していません。プレビュー側で構造を確認し、必要なら未対応のブロックを上下のレベルで操作してください。
          </p>
        </div>
      );
    case "math_display":
      return (
        <div className="space-y-3">
          <LabeledTextarea
            label="LaTeX"
            value={block.latex}
            onChange={(latex) => onChange({ ...block, latex })}
            rows={3}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!block.numbered}
              onChange={(e) =>
                onChange({ ...block, numbered: e.target.checked })
              }
            />
            番号付き
          </label>
        </div>
      );
    case "figure":
      return (
        <div className="space-y-3">
          <LabeledInput
            label="ラベル"
            value={block.label}
            onChange={(label) => onChange({ ...block, label })}
          />
          <LabeledInput
            label="アセットID"
            value={block.assetId}
            onChange={(assetId) => onChange({ ...block, assetId })}
          />
          <InlineChildrenEditor
            label="キャプション"
            value={block.caption ?? []}
            onChange={(caption) => onChange({ ...block, caption })}
          />
        </div>
      );
    case "footnote_section":
      return (
        <div className="space-y-3">
          {block.items.map((it, i) => (
            <div key={i} className="border rounded p-2">
              <div className="grid grid-cols-[6ch_1fr] gap-2">
                <LabeledInput
                  label="ref"
                  value={it.ref}
                  onChange={(ref) => {
                    const items = block.items.map((x, j) =>
                      j === i ? { ...x, ref } : x,
                    );
                    onChange({ ...block, items });
                  }}
                />
                <InlineChildrenEditor
                  label="本文"
                  value={it.children}
                  onChange={(children) => {
                    const items = block.items.map((x, j) =>
                      j === i ? { ...x, children } : x,
                    );
                    onChange({ ...block, items });
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { ref: "", children: [{ kind: "text", value: "" }] }],
              })
            }
          >
            <Plus className="h-4 w-4" /> 注を追加
          </Button>
        </div>
      );
    case "question_group":
      return (
        <div className="space-y-3">
          <p className="text-sm text-foreground/70">
            問数: {block.children.length}
          </p>
          {block.children.map((q, i) => (
            <QuestionEditor
              key={q.id || i}
              q={q}
              onChange={(next) => {
                const children = block.children.map((x, j) =>
                  j === i ? next : x,
                );
                onChange({ ...block, children });
              }}
              onDelete={() => {
                const children = block.children.filter((_, j) => j !== i);
                onChange({ ...block, children });
              }}
            />
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...block,
                children: [
                  ...block.children,
                  {
                    id: `q-${Date.now()}`,
                    number: `(${block.children.length + 1})`,
                    prompt: [{ kind: "paragraph", children: [{ kind: "text", value: "" }] }],
                    answerType: "essay",
                  },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" /> 設問を追加
          </Button>
        </div>
      );
    default:
      return (
        <div className="text-sm text-foreground/60">
          このブロック ({block.kind}) は構造的編集のみ対応しています。プレビューで内容を確認してください。
        </div>
      );
  }
}

function QuestionEditor({
  q,
  onChange,
  onDelete,
}: {
  q: Question;
  onChange: (q: Question) => void;
  onDelete: () => void;
}) {
  return (
    <div className="border rounded p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <LabeledInput
          label="番号"
          value={q.number}
          onChange={(number) => onChange({ ...q, number })}
        />
        <LabeledSelect
          label="解答タイプ"
          value={q.answerType}
          options={[
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
          ]}
          onChange={(answerType) =>
            onChange({ ...q, answerType: answerType as Question["answerType"] })
          }
        />
      </div>
      <div className="grid grid-cols-3 gap-2 items-end">
        <LabeledSelect
          label="字数制限"
          value={q.constraint?.kind ?? "none"}
          options={["none", "chars", "words", "lines"]}
          onChange={(kind) =>
            onChange({
              ...q,
              constraint:
                kind === "none"
                  ? undefined
                  : { kind: kind as "chars" | "words" | "lines", max: q.constraint?.max },
            })
          }
        />
        <LabeledInput
          label="最小"
          value={String(q.constraint?.min ?? "")}
          onChange={(v) =>
            onChange({
              ...q,
              constraint: q.constraint
                ? { ...q.constraint, min: parseIntSafe(v) }
                : v
                  ? { kind: "chars", min: parseIntSafe(v) }
                  : undefined,
            })
          }
        />
        <LabeledInput
          label="最大"
          value={String(q.constraint?.max ?? "")}
          onChange={(v) =>
            onChange({
              ...q,
              constraint: q.constraint
                ? { ...q.constraint, max: parseIntSafe(v) }
                : v
                  ? { kind: "chars", max: parseIntSafe(v) }
                  : undefined,
            })
          }
        />
      </div>
      <Button size="sm" variant="outline" onClick={onDelete}>
        <Trash2 className="h-4 w-4" /> 削除
      </Button>
    </div>
  );
}

function parseIntSafe(s: string): number | undefined {
  if (!s.trim()) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

// ─────────────────────────────────────────────────────────────
// Inline children editor (textarea with markup hints)
// ─────────────────────────────────────────────────────────────

function InlineChildrenEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: InlineNode[];
  onChange: (v: InlineNode[]) => void;
}) {
  const text = useMemo(() => markupOf(value), [value]);
  const [draft, setDraft] = useState(text);

  // Resync when external value changes substantially
  useMemo(() => {
    setDraft(text);
  }, [text]);

  return (
    <div>
      <div className="text-xs font-medium mb-1">{label}</div>
      <textarea
        className="w-full border rounded p-2 text-sm font-mono"
        rows={4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onChange(parseMarkup(draft))}
        placeholder="プレーンテキストや {ruby:漢字|かんじ} {underline:ア|本文} {math:x^2} などの記法が使えます"
      />
      <div className="text-[10px] text-foreground/60 mt-1">
        記法: {"{ruby:基|読}, {underline:ア|語}, {kakko:「」|語}, {math:LaTeX}, {blank:id|表示}"}
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs font-medium block">
      <div className="mb-1">{label}</div>
      <input
        className="w-full border rounded px-2 py-1.5 text-sm font-normal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="text-xs font-medium block">
      <div className="mb-1">{label}</div>
      <textarea
        className="w-full border rounded px-2 py-1.5 text-sm font-mono"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs font-medium block">
      <div className="mb-1">{label}</div>
      <select
        className="w-full border rounded px-2 py-1.5 text-sm font-normal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// Inline markup helpers are in ./inline-markup so they can be tested without React.
import {
  inlineNodesToMarkup as markupOf,
  parseInlineMarkup as parseMarkup,
} from "./inline-markup";
export { inlineNodesToMarkup, parseInlineMarkup } from "./inline-markup";

// ─────────────────────────────────────────────────────────────
// Quick-insert menu
// ─────────────────────────────────────────────────────────────

function BlockInsertMenu({ onInsert }: { onInsert: (b: BlockNode) => void }) {
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onInsert({
            kind: "paragraph",
            children: [{ kind: "text", value: "" }],
          })
        }
      >
        <Plus className="h-4 w-4 me-1" /> 段落
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onInsert({
            kind: "section",
            number: "第1問",
            children: [],
          })
        }
      >
        <Plus className="h-4 w-4 me-1" /> 大問
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onInsert({
            kind: "instruction",
            children: [{ kind: "text", value: "次の文章を読んで、後の設問に答えよ。" }],
          })
        }
      >
        <Plus className="h-4 w-4 me-1" /> 指示
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onInsert({
            kind: "math_display",
            latex: "\\int_0^1 x\\, dx",
          })
        }
      >
        <Plus className="h-4 w-4 me-1" /> 数式
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onInsert({
            kind: "footnote_section",
            items: [{ ref: "○", children: [{ kind: "text", value: "" }] }],
          })
        }
      >
        <Plus className="h-4 w-4 me-1" /> 注
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onInsert({
            kind: "question_group",
            numbering: "kakko-kanji",
            children: [],
          })
        }
      >
        <Plus className="h-4 w-4 me-1" /> 設問群
      </Button>
    </>
  );
}
