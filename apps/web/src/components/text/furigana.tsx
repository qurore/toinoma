import { Fragment } from "react";

// ──────────────────────────────────────────────
// ATH-033: Furigana (ruby text) support
// ──────────────────────────────────────────────
// Syntax: {漢字|かんじ} → <ruby><rb>漢字</rb><rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>

/**
 * Regex to match {base|reading} furigana syntax.
 * Captures the base text and the reading (furigana) text.
 */
const FURIGANA_REGEX = /\{([^|{}]+)\|([^|{}]+)\}/g;

interface FuriganaSegment {
  type: "text" | "ruby";
  text: string;
  reading?: string;
}

/**
 * Parse raw text containing {漢字|かんじ} syntax into segments.
 */
export function parseFurigana(raw: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  let lastIndex = 0;

  for (const match of raw.matchAll(FURIGANA_REGEX)) {
    const matchStart = match.index;

    // Add plain text before this match
    if (matchStart > lastIndex) {
      segments.push({
        type: "text",
        text: raw.slice(lastIndex, matchStart),
      });
    }

    segments.push({
      type: "ruby",
      text: match[1],
      reading: match[2],
    });

    lastIndex = matchStart + match[0].length;
  }

  // Add remaining plain text after the last match
  if (lastIndex < raw.length) {
    segments.push({
      type: "text",
      text: raw.slice(lastIndex),
    });
  }

  return segments;
}

// ──────────────────────────────────────────────
// Components
// ──────────────────────────────────────────────

interface RubyTextProps {
  /** Raw text containing {漢字|かんじ} furigana syntax */
  children: string;
  /** Additional className applied to the wrapper span */
  className?: string;
}

/**
 * RubyText — Renders text with furigana (ruby annotations).
 *
 * Input:  "{漢字|かんじ}を{勉強|べんきょう}する"
 * Output: <ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>を
 *         <ruby>勉強<rp>(</rp><rt>べんきょう</rt><rp>)</rp></ruby>する
 *
 * The <rp> elements ensure graceful degradation in browsers that
 * do not support ruby annotations — the reading is shown in parentheses.
 */
export function RubyText({ children, className }: RubyTextProps) {
  const segments = parseFurigana(children);

  // No furigana found — return plain text without extra wrapper
  if (segments.length === 1 && segments[0].type === "text") {
    return className ? (
      <span className={className}>{children}</span>
    ) : (
      <>{children}</>
    );
  }

  return (
    <span className={className}>
      {segments.map((segment, i) => {
        if (segment.type === "text") {
          return <Fragment key={i}>{segment.text}</Fragment>;
        }

        return (
          <ruby key={i}>
            {segment.text}
            <rp>(</rp>
            <rt>{segment.reading}</rt>
            <rp>)</rp>
          </ruby>
        );
      })}
    </span>
  );
}
