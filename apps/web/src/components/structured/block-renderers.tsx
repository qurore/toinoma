/**
 * Block-node renderers for StructuredContentView.
 */
"use client";

import type {
  BlockNode,
  BlockSection,
  BlockSubsection,
  BlockPassage,
  BlockInstruction,
  BlockParagraph,
  BlockKanbun,
  BlockMathDisplay,
  BlockFigure,
  BlockTable,
  BlockChoices,
  BlockRearrange,
  BlockAudio,
  BlockFootnoteSection,
  BlockCitation,
  BlockSpacer,
  BlockQuestionGroup,
  Question,
} from "@toinoma/shared/schemas";
import { LatexRenderer } from "@/components/math/latex-renderer";
import { InlineList, inlineToText, type InlineCtx } from "./inline-renderers";
import { KanbunBlock } from "./kanbun-block";

export interface BlockCtx extends InlineCtx {
  /** Resolves an asset id (figure, audio) to a URL. */
  resolveAsset: (assetId: string) => string | undefined;
  /** Renders a question (provided by parent so it can wire grading state). */
  renderQuestion?: (q: Question) => React.ReactNode;
}

export function BlockList({
  nodes,
  ctx,
}: {
  nodes: BlockNode[];
  ctx: BlockCtx;
}) {
  return (
    <>
      {nodes.map((node, i) => (
        <BlockSwitch key={i} node={node} ctx={ctx} />
      ))}
    </>
  );
}

export function BlockSwitch({
  node,
  ctx,
}: {
  node: BlockNode;
  ctx: BlockCtx;
}) {
  switch (node.kind) {
    case "section":
      return <SectionBlock node={node} ctx={ctx} />;
    case "subsection":
      return <SubsectionBlock node={node} ctx={ctx} />;
    case "passage":
      return <PassageBlock node={node} ctx={ctx} />;
    case "instruction":
      return <InstructionBlock node={node} ctx={ctx} />;
    case "paragraph":
      return <ParagraphBlock node={node} ctx={ctx} />;
    case "kanbun_block":
      return <KanbunBlockWrap node={node} ctx={ctx} />;
    case "math_display":
      return <MathDisplayBlock node={node} />;
    case "figure":
      return <FigureBlock node={node} ctx={ctx} />;
    case "table":
      return <TableBlock node={node} ctx={ctx} />;
    case "choices":
      return <ChoicesBlock node={node} ctx={ctx} />;
    case "rearrange":
      return <RearrangeBlock node={node} />;
    case "audio":
      return <AudioBlock node={node} ctx={ctx} />;
    case "footnote_section":
      return <FootnoteSectionBlock node={node} ctx={ctx} />;
    case "citation":
      return <CitationBlock node={node} ctx={ctx} />;
    case "spacer":
      return <SpacerBlock node={node} />;
    case "question_group":
      return <QuestionGroupBlock node={node} ctx={ctx} />;
  }
}

function SectionBlock({
  node,
  ctx,
}: {
  node: BlockSection;
  ctx: BlockCtx;
}) {
  return (
    <section className="structured-section my-8">
      <h2 className="text-xl font-bold mb-4 text-center">
        {node.number}
        {node.title ? (
          <>
            {" "}
            <span className="ms-2 font-normal">
              <InlineList nodes={node.title} ctx={ctx} />
            </span>
          </>
        ) : null}
      </h2>
      <BlockList nodes={node.children} ctx={ctx} />
    </section>
  );
}

function SubsectionBlock({
  node,
  ctx,
}: {
  node: BlockSubsection;
  ctx: BlockCtx;
}) {
  return (
    <div className="structured-subsection my-4 ps-4 border-s-2 border-foreground/20">
      <div className="text-sm font-bold mb-2">{node.marker}</div>
      <BlockList nodes={node.children} ctx={ctx} />
    </div>
  );
}

function PassageBlock({
  node,
  ctx,
}: {
  node: BlockPassage;
  ctx: BlockCtx;
}) {
  const verticalCls = node.vertical
    ? "[writing-mode:vertical-rl] [text-orientation:mixed] max-h-[80vh] overflow-x-auto"
    : "";
  return (
    <article
      lang={langToBcp(node.lang)}
      className={`structured-passage my-6 ${verticalCls}`}
      data-passage-lang={node.lang}
      role="article"
      aria-orientation={node.vertical ? "vertical" : "horizontal"}
    >
      <BlockList nodes={node.children} ctx={ctx} />
      {node.source ? (
        <div className="mt-4 text-end text-sm">
          （<InlineList nodes={node.source} ctx={ctx} />）
        </div>
      ) : null}
    </article>
  );
}

function InstructionBlock({
  node,
  ctx,
}: {
  node: BlockInstruction;
  ctx: BlockCtx;
}) {
  return (
    <p className="structured-instruction my-3 font-medium">
      <InlineList nodes={node.children} ctx={ctx} />
    </p>
  );
}

function ParagraphBlock({
  node,
  ctx,
}: {
  node: BlockParagraph;
  ctx: BlockCtx;
}) {
  const indentStyle = node.indent ? { textIndent: `${node.indent}em` } : undefined;
  const align =
    node.align === "center"
      ? "text-center"
      : node.align === "end"
        ? "text-end"
        : "";
  return (
    <p className={`structured-paragraph my-2 leading-relaxed ${align}`} style={indentStyle}>
      <InlineList nodes={node.children} ctx={ctx} />
    </p>
  );
}

function KanbunBlockWrap({
  node,
  ctx: _ctx,
}: {
  node: BlockKanbun;
  ctx: BlockCtx;
}) {
  return <KanbunBlock lines={node.lines} />;
}

function MathDisplayBlock({ node }: { node: BlockMathDisplay }) {
  return (
    <div
      className="structured-math-display my-4 text-center"
      data-confidence={node.confidence ?? "high"}
    >
      <LatexRenderer content={node.latex} displayMode />
      {node.numbered ? <span className="text-sm ms-3">(*)</span> : null}
    </div>
  );
}

function FigureBlock({
  node,
  ctx,
}: {
  node: BlockFigure;
  ctx: BlockCtx;
}) {
  const url = ctx.resolveAsset(node.assetId);
  const captionText = node.caption ? inlineToText(node.caption) : node.label;
  return (
    <figure
      id={anchorId("figure", node.label)}
      className="structured-figure my-4 text-center"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={captionText}
          className="inline-block max-w-full h-auto"
        />
      ) : (
        <div className="inline-block w-full max-w-md aspect-video bg-foreground/5 border border-dashed border-foreground/30 flex items-center justify-center text-foreground/60">
          {node.label}（画像未アップロード）
        </div>
      )}
      <figcaption className="mt-2 text-sm text-foreground/70">
        <span className="font-medium">{node.label}</span>
        {node.caption ? (
          <>
            {"  "}
            <InlineList nodes={node.caption} ctx={ctx} />
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}

function TableBlock({
  node,
  ctx,
}: {
  node: BlockTable;
  ctx: BlockCtx;
}) {
  return (
    <div
      id={anchorId("table", node.label)}
      className="structured-table my-4 overflow-x-auto"
    >
      <div className="text-sm font-medium mb-2">
        {node.label}
        {node.caption ? (
          <>
            {"  "}
            <InlineList nodes={node.caption} ctx={ctx} />
          </>
        ) : null}
      </div>
      <table className="border-collapse border border-foreground/30 w-full text-sm">
        <tbody>
          {node.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const Tag = cell.header ? "th" : "td";
                const align =
                  cell.align === "center"
                    ? "text-center"
                    : cell.align === "end"
                      ? "text-end"
                      : "text-start";
                return (
                  <Tag
                    key={ci}
                    rowSpan={cell.rowspan}
                    colSpan={cell.colspan}
                    className={`border border-foreground/30 px-2 py-1 ${align} ${cell.header ? "bg-foreground/5 font-medium" : ""}`}
                  >
                    <InlineList nodes={cell.children} ctx={ctx} />
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChoicesBlock({
  node,
  ctx,
}: {
  node: BlockChoices;
  ctx: BlockCtx;
}) {
  return (
    <ol className="structured-choices my-3 ps-6 list-none space-y-1">
      {node.options.map((opt, i) => (
        <li key={opt.id} className="flex gap-2">
          <span className="font-medium min-w-[2ch]">
            {labelForChoice(node.style, i)}
          </span>
          <span>
            <InlineList nodes={opt.children} ctx={ctx} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function RearrangeBlock({ node }: { node: BlockRearrange }) {
  return (
    <div className="structured-rearrange my-3 p-3 border rounded bg-foreground/5">
      <div className="text-sm font-medium mb-2">並べ替え</div>
      <div className="flex flex-wrap gap-2">
        {node.tokens.map((t, i) => (
          <span key={i} className="px-2 py-1 border rounded bg-background">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function AudioBlock({
  node,
  ctx,
}: {
  node: BlockAudio;
  ctx: BlockCtx;
}) {
  const url = ctx.resolveAsset(node.assetId);
  return (
    <div className="structured-audio my-4">
      {url ? (
        <audio controls src={url} className="w-full" />
      ) : (
        <div className="p-3 border rounded bg-foreground/5 text-foreground/70">
          音声ファイルが未アップロードです
        </div>
      )}
      {node.transcript ? (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer">スクリプトを表示</summary>
          <div className="mt-2">
            <InlineList nodes={node.transcript} ctx={ctx} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

function FootnoteSectionBlock({
  node,
  ctx,
}: {
  node: BlockFootnoteSection;
  ctx: BlockCtx;
}) {
  return (
    <aside className="structured-footnotes my-4 p-3 border-s-4 border-foreground/20 bg-foreground/5 rounded">
      <div className="text-sm font-medium mb-2">注</div>
      <dl className="text-sm space-y-1">
        {node.items.map((it, i) => (
          <div
            key={i}
            id={anchorId("footnote", it.ref)}
            className="flex gap-2"
          >
            <dt className="font-medium min-w-[3ch]">{it.ref}</dt>
            <dd>
              <InlineList nodes={it.children} ctx={ctx} />
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function CitationBlock({
  node,
  ctx,
}: {
  node: BlockCitation;
  ctx: BlockCtx;
}) {
  return (
    <div className="structured-citation my-3 text-end text-sm text-foreground/70">
      （<InlineList nodes={node.children} ctx={ctx} />）
    </div>
  );
}

function SpacerBlock({ node }: { node: BlockSpacer }) {
  return <div style={{ height: `${node.lines * 0.75}rem` }} aria-hidden="true" />;
}

function QuestionGroupBlock({
  node,
  ctx,
}: {
  node: BlockQuestionGroup;
  ctx: BlockCtx;
}) {
  return (
    <div className="structured-question-group my-6 p-4 border rounded-lg bg-background">
      <h3 className="font-bold mb-3 text-lg">設問</h3>
      <ol className="space-y-4 list-none">
        {node.children.map((q) => (
          <li
            key={q.id}
            id={anchorId("question", q.id)}
            data-question-number={q.number}
          >
            {ctx.renderQuestion ? (
              ctx.renderQuestion(q)
            ) : (
              <DefaultQuestionRender q={q} ctx={ctx} />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function DefaultQuestionRender({
  q,
  ctx,
}: {
  q: Question;
  ctx: BlockCtx;
}) {
  return (
    <div>
      <div className="font-medium mb-2">
        <span className="me-2">{q.number}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/10">
          {q.answerType}
        </span>
        {q.constraint ? (
          <span className="ms-2 text-xs text-foreground/70">
            {formatConstraint(q.constraint)}
          </span>
        ) : null}
      </div>
      <div className="text-sm">
        <BlockList nodes={q.prompt} ctx={ctx} />
      </div>
    </div>
  );
}

function formatConstraint(c: NonNullable<Question["constraint"]>): string {
  const unit =
    c.kind === "chars" ? "字" : c.kind === "lines" ? "行" : "語";
  if (c.min && c.max) return `${c.min}〜${c.max}${unit}`;
  if (c.max) return `${c.max}${unit}以内`;
  if (c.min) return `${c.min}${unit}以上`;
  return "";
}

function langToBcp(lang: BlockPassage["lang"]): string {
  switch (lang) {
    case "en":
      return "en";
    case "kanbun":
    case "ja-classical":
    case "ja-modern":
    case "mixed":
      return "ja";
  }
}

function labelForChoice(style: BlockChoices["style"], i: number): string {
  switch (style) {
    case "a-z":
      return `${String.fromCharCode(97 + i)})`;
    case "A-Z":
      return `${String.fromCharCode(65 + i)})`;
    case "kakko-arabic":
      return `(${i + 1})`;
    case "kakko-kanji":
      return `(${kanjiNumeral(i + 1)})`;
    case "maru-kanji":
      return maruKanji(i + 1);
    case "roman-upper":
      return romanUpper(i + 1);
  }
}

function kanjiNumeral(n: number): string {
  const map = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  return map[n - 1] ?? `${n}`;
}

function maruKanji(n: number): string {
  if (n >= 1 && n <= 20) return String.fromCharCode(0x2460 + n - 1);
  return `(${n})`;
}

function romanUpper(n: number): string {
  const map = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return map[n - 1] ?? `${n}`;
}

export function anchorId(prefix: string, label: string): string {
  return `sc-${prefix}-${label.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}
