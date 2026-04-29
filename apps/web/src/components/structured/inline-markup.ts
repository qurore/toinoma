/**
 * Pure conversion between InlineNode[] and a compact text-with-tokens form
 * used in the editor textarea.
 *
 * Round-trip representation:
 *   {ruby:base|reading}
 *   {underline:marker|content}
 *   {kakko:STYLE|content}
 *   {math:latex}
 *   {blank:id|label}
 *   {ref:refType|target}
 *   {em:content}
 *   {strong:content}
 *   {linebreak}
 *   {foreign:lang|value} or {foreign:lang|value|reading}
 *
 * Anything outside `{...}` tokens is plain text.
 */
import type { InlineNode } from "@toinoma/shared/schemas";

const INLINE_TOKEN_RE =
  /\{(ruby|underline|kakko|math|blank|ref|em|strong|linebreak|foreign)(:[^}]*)?\}/g;

export function inlineNodesToMarkup(nodes: InlineNode[]): string {
  return nodes.map(inlineToMarkupOne).join("");
}

function inlineToMarkupOne(n: InlineNode): string {
  switch (n.kind) {
    case "text":
      return n.value;
    case "linebreak":
      return "{linebreak}";
    case "ruby":
      return `{ruby:${n.base}|${n.reading}}`;
    case "em":
      return `{em:${inlineNodesToMarkup(n.children)}}`;
    case "strong":
      return `{strong:${inlineNodesToMarkup(n.children)}}`;
    case "kakko":
      return `{kakko:${n.style}|${inlineNodesToMarkup(n.children)}}`;
    case "underline":
      return `{underline:${n.marker ?? ""}|${inlineNodesToMarkup(n.children)}}`;
    case "blank":
      return `{blank:${n.id}|${n.label ?? ""}}`;
    case "math_inline":
      return `{math:${n.latex}}`;
    case "ref":
      return `{ref:${n.refType}|${n.target}}`;
    case "foreign":
      return `{foreign:${n.lang}|${n.value}${n.reading ? `|${n.reading}` : ""}}`;
  }
}

export function parseInlineMarkup(src: string): InlineNode[] {
  const out: InlineNode[] = [];
  let i = 0;
  const re = new RegExp(INLINE_TOKEN_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > i) out.push({ kind: "text", value: src.slice(i, m.index) });
    out.push(parseInlineToken(m[1]!, m[2]?.slice(1) ?? ""));
    i = re.lastIndex;
  }
  if (i < src.length) out.push({ kind: "text", value: src.slice(i) });
  return out.length ? out : [{ kind: "text", value: "" }];
}

function parseInlineToken(name: string, args: string): InlineNode {
  const parts = args.split("|");
  switch (name) {
    case "linebreak":
      return { kind: "linebreak" };
    case "ruby":
      return { kind: "ruby", base: parts[0] ?? "", reading: parts[1] ?? "" };
    case "underline":
      return {
        kind: "underline",
        marker: parts[0] || undefined,
        children: parseInlineMarkup(parts.slice(1).join("|")),
      };
    case "kakko":
      return {
        kind: "kakko",
        style: (parts[0] as "「」" | "『』" | "（）" | "［］" | "【】") || "「」",
        children: parseInlineMarkup(parts.slice(1).join("|")),
      };
    case "math":
      return { kind: "math_inline", latex: args };
    case "blank":
      return { kind: "blank", id: parts[0] ?? "blank", label: parts[1] };
    case "ref":
      return {
        kind: "ref",
        refType:
          (parts[0] as "figure" | "table" | "footnote" | "marker" | "passage" | "question") ||
          "marker",
        target: parts[1] ?? "",
      };
    case "em":
      return { kind: "em", children: parseInlineMarkup(args) };
    case "strong":
      return { kind: "strong", children: parseInlineMarkup(args) };
    case "foreign":
      return {
        kind: "foreign",
        lang: parts[0] ?? "en",
        value: parts[1] ?? "",
        reading: parts[2],
      };
    default:
      return { kind: "text", value: `{${name}:${args}}` };
  }
}
