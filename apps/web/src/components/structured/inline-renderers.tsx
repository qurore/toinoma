/**
 * Inline-node renderers for StructuredContentView.
 *
 * Each renderer is a tiny pure component. They're factored out from the block-level
 * renderers to keep nesting limited and to allow targeted memoization.
 */
"use client";

import { Fragment } from "react";
import type {
  InlineNode,
  InlineUnderline,
  InlineRuby,
  InlineKakko,
  InlineBlank,
  InlineMath,
  InlineRef,
  InlineForeign,
  InlineEm,
  InlineStrong,
} from "@toinoma/shared/schemas";
import { LatexRenderer } from "@/components/math/latex-renderer";

export interface InlineCtx {
  /** Called when an underline marker is clicked / activated. */
  onMarkerJump?: (marker: string) => void;
  /** Called when a footnote ref is clicked. */
  onFootnoteJump?: (ref: string) => void;
  /** Called when a figure ref is clicked. */
  onFigureJump?: (label: string) => void;
  /** Called when a blank is clicked (e.g., to focus its question). */
  onBlankJump?: (blankId: string) => void;
  /** Render-only mode: disable jump handlers (used in editor preview). */
  inert?: boolean;
}

const KAKKO_CHARS = {
  "「」": ["「", "」"],
  "『』": ["『", "』"],
  "（）": ["（", "）"],
  "［］": ["［", "］"],
  "【】": ["【", "】"],
} as const;

export function InlineList({
  nodes,
  ctx,
}: {
  nodes: InlineNode[];
  ctx: InlineCtx;
}) {
  return (
    <>
      {nodes.map((node, i) => (
        <InlineSwitch key={i} node={node} ctx={ctx} />
      ))}
    </>
  );
}

export function InlineSwitch({
  node,
  ctx,
}: {
  node: InlineNode;
  ctx: InlineCtx;
}) {
  switch (node.kind) {
    case "text":
      return <Fragment>{node.value}</Fragment>;
    case "linebreak":
      return <br />;
    case "ruby":
      return <RubyNode node={node} />;
    case "em":
      return <EmNode node={node} ctx={ctx} />;
    case "strong":
      return <StrongNode node={node} ctx={ctx} />;
    case "kakko":
      return <KakkoNode node={node} ctx={ctx} />;
    case "underline":
      return <UnderlineNode node={node} ctx={ctx} />;
    case "blank":
      return <BlankNode node={node} ctx={ctx} />;
    case "math_inline":
      return <MathInlineNode node={node} />;
    case "ref":
      return <RefNode node={node} ctx={ctx} />;
    case "foreign":
      return <ForeignNode node={node} />;
  }
}

function RubyNode({ node }: { node: InlineRuby }) {
  return (
    <ruby className="ruby-node">
      {node.base}
      <rp>（</rp>
      <rt className="ruby-reading">{node.reading}</rt>
      <rp>）</rp>
    </ruby>
  );
}

function EmNode({ node, ctx }: { node: InlineEm; ctx: InlineCtx }) {
  return (
    <em className="italic">
      <InlineList nodes={node.children} ctx={ctx} />
    </em>
  );
}

function StrongNode({ node, ctx }: { node: InlineStrong; ctx: InlineCtx }) {
  return (
    <strong className="font-bold">
      <InlineList nodes={node.children} ctx={ctx} />
    </strong>
  );
}

function KakkoNode({ node, ctx }: { node: InlineKakko; ctx: InlineCtx }) {
  const [open, close] = KAKKO_CHARS[node.style];
  return (
    <span className="kakko">
      <span aria-hidden="true">{open}</span>
      <InlineList nodes={node.children} ctx={ctx} />
      <span aria-hidden="true">{close}</span>
    </span>
  );
}

function UnderlineNode({
  node,
  ctx,
}: {
  node: InlineUnderline;
  ctx: InlineCtx;
}) {
  const label = node.marker ? `傍線部${node.marker}` : "下線部";
  if (!node.marker || ctx.inert) {
    return (
      <span className="underline decoration-2 underline-offset-4" aria-label={label}>
        <InlineList nodes={node.children} ctx={ctx} />
      </span>
    );
  }
  return (
    <button
      type="button"
      className="underline decoration-2 underline-offset-4 cursor-pointer focus:outline-2 focus:outline-blue-500 rounded-sm"
      aria-label={label}
      data-marker={node.marker}
      onClick={() => ctx.onMarkerJump?.(node.marker!)}
    >
      <InlineList nodes={node.children} ctx={ctx} />
      <sup className="text-xs ms-0.5 text-blue-700 font-bold">{node.marker}</sup>
    </button>
  );
}

function BlankNode({ node, ctx }: { node: InlineBlank; ctx: InlineCtx }) {
  const widthCls =
    node.width === "short"
      ? "min-w-[3ch]"
      : node.width === "medium"
        ? "min-w-[6ch]"
        : node.width === "long"
          ? "min-w-[10ch]"
          : "min-w-[4ch]";
  if (ctx.inert) {
    return (
      <span
        className={`inline-flex items-center justify-center px-1 mx-0.5 border border-dashed border-foreground/40 rounded bg-foreground/5 text-foreground/70 ${widthCls}`}
        aria-label={`空欄${node.label ?? node.id}`}
      >
        {node.label ?? node.id}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center px-1 mx-0.5 border border-dashed border-blue-400 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 focus:outline-2 focus:outline-blue-500 ${widthCls}`}
      aria-label={`空欄${node.label ?? node.id}`}
      data-blank-id={node.id}
      onClick={() => ctx.onBlankJump?.(node.id)}
    >
      {node.label ?? node.id}
    </button>
  );
}

function MathInlineNode({ node }: { node: InlineMath }) {
  return (
    <span className="inline-math align-middle" data-confidence={node.confidence ?? "high"}>
      <LatexRenderer content={node.latex} displayMode={false} />
    </span>
  );
}

function RefNode({ node, ctx }: { node: InlineRef; ctx: InlineCtx }) {
  const label = node.target;
  if (ctx.inert) {
    return <span className="text-blue-700 underline">{label}</span>;
  }
  const handler = () => {
    if (node.refType === "figure" || node.refType === "table")
      ctx.onFigureJump?.(label);
    else if (node.refType === "footnote") ctx.onFootnoteJump?.(label);
    else if (node.refType === "marker") ctx.onMarkerJump?.(label);
  };
  return (
    <button
      type="button"
      className="text-blue-700 underline hover:text-blue-900 focus:outline-2 focus:outline-blue-500"
      onClick={handler}
    >
      {label}
    </button>
  );
}

function ForeignNode({ node }: { node: InlineForeign }) {
  if (node.reading) {
    return (
      <ruby lang={node.lang}>
        {node.value}
        <rp>（</rp>
        <rt>{node.reading}</rt>
        <rp>）</rp>
      </ruby>
    );
  }
  return (
    <span lang={node.lang} className="foreign">
      {node.value}
    </span>
  );
}

/**
 * Linearize inline children to a plain string for screen-reader aria-label fallback.
 */
export function inlineToText(nodes: InlineNode[]): string {
  return nodes.map(inlineNodeToText).join("");
}

function inlineNodeToText(n: InlineNode): string {
  switch (n.kind) {
    case "text":
      return n.value;
    case "linebreak":
      return " ";
    case "ruby":
      return n.base;
    case "foreign":
      return n.value;
    case "math_inline":
      return n.latex;
    case "ref":
      return n.target;
    case "blank":
      return n.label ?? n.id;
    case "em":
    case "strong":
    case "kakko":
    case "underline":
      return inlineToText(n.children);
  }
}
