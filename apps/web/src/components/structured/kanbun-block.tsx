/**
 * Kanbun block renderer.
 *
 * Kanbun (漢文) is Chinese text annotated with Japanese reading marks (kunten):
 *   - okurigana: small katakana attached to the bottom-left of a character
 *   - kaeriten: re-order marks (レ, 一, 二, …) attached to the bottom-right
 *   - ruby (furigana): small kana on top
 *
 * The text is read top-to-bottom, right-to-left (vertical Japanese), but for
 * readability on the web we render each line as a horizontal flex of characters
 * with stacked annotations, then optionally rotate the whole block via writing-mode.
 *
 * This implementation prefers the horizontal scan-line layout for accessibility
 * and screen readability, with a `vertical` flag for paper-faithful presentation.
 */
"use client";

import type { KanbunLine, KanbunToken } from "@toinoma/shared/schemas";

interface Props {
  lines: KanbunLine[];
  vertical?: boolean;
}

export function KanbunBlock({ lines, vertical = true }: Props) {
  const containerCls = vertical
    ? "flex flex-row-reverse gap-3 [writing-mode:vertical-rl] [text-orientation:mixed] py-2 max-h-[60vh] overflow-x-auto"
    : "flex flex-col gap-2 py-2";
  return (
    <div className={`structured-kanbun ${containerCls}`} aria-label="漢文">
      {lines.map((line, i) => (
        <KanbunLineRow key={i} line={line} vertical={vertical} />
      ))}
    </div>
  );
}

function KanbunLineRow({
  line,
  vertical,
}: {
  line: KanbunLine;
  vertical: boolean;
}) {
  const lineCls = vertical
    ? "flex flex-col gap-0 leading-tight"
    : "flex flex-row gap-0 items-end leading-tight";
  const indentStyle = line.indent
    ? vertical
      ? { paddingTop: `${line.indent}em` }
      : { paddingLeft: `${line.indent}em` }
    : undefined;
  return (
    <div className={lineCls} style={indentStyle}>
      {line.tokens.map((tok, i) => (
        <KanbunTokenCell key={i} token={tok} vertical={vertical} />
      ))}
    </div>
  );
}

function KanbunTokenCell({
  token,
  vertical,
}: {
  token: KanbunToken;
  vertical: boolean;
}) {
  // Each token cell is a 3x3-ish grid: [ruby above] [base center] [okurigana left, kaeriten right]
  if (vertical) {
    return (
      <span
        className="kanbun-token relative inline-flex flex-col items-center justify-center min-h-[2em] min-w-[1.4em] mx-0"
        aria-label={tokenAriaLabel(token)}
      >
        {token.ruby ? (
          <span className="absolute top-[-1.1em] text-[0.55em] text-foreground/70 whitespace-nowrap">
            {token.ruby}
          </span>
        ) : null}
        <span className="text-base">{token.char}</span>
        {token.okurigana ? (
          <span className="absolute right-[-0.6em] top-1/2 text-[0.6em] -translate-y-1/4 leading-none">
            {token.okurigana}
          </span>
        ) : null}
        {token.kaeriten ? (
          <span className="absolute left-[-0.5em] bottom-[0.05em] text-[0.55em] font-bold text-foreground/80">
            {token.kaeriten}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span
      className="kanbun-token relative inline-flex flex-col items-center justify-end min-h-[2.6em] min-w-[1.6em] mx-[1px]"
      aria-label={tokenAriaLabel(token)}
    >
      {token.ruby ? (
        <span className="text-[0.55em] text-foreground/70 leading-none mb-[0.05em]">
          {token.ruby}
        </span>
      ) : null}
      <span className="text-base relative">
        {token.char}
        {token.okurigana ? (
          <span className="absolute -bottom-[0.4em] -left-[0.4em] text-[0.55em] leading-none text-foreground/80">
            {token.okurigana}
          </span>
        ) : null}
        {token.kaeriten ? (
          <span className="absolute -bottom-[0.3em] -right-[0.4em] text-[0.55em] font-bold leading-none">
            {token.kaeriten}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function tokenAriaLabel(t: KanbunToken): string {
  const parts = [t.char];
  if (t.ruby) parts.push(`読み: ${t.ruby}`);
  if (t.okurigana) parts.push(`送り仮名: ${t.okurigana}`);
  if (t.kaeriten) parts.push(`返り点: ${t.kaeriten}`);
  return parts.join(" ");
}
