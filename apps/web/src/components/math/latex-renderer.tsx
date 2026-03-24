"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  content: string;
  displayMode?: boolean;
}

/**
 * Renders LaTeX math expressions using KaTeX.
 * Inline: $...$ or \(...\)
 * Block: $$...$$ or \[...\]
 */
export function LatexRenderer({ content, displayMode = false }: LatexRendererProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(content, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      return content;
    }
  }, [content, displayMode]);

  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
      className="katex-container"
    />
  );
}

/**
 * Renders text with mixed LaTeX expressions.
 * Parses inline ($...$) and block ($$...$$) math.
 */
export function MathText({ children }: { children: string }) {
  const parts = useMemo(() => {
    const result: Array<{ type: "text" | "inline" | "block"; content: string }> = [];
    let remaining = children;

    while (remaining.length > 0) {
      // Check for block math $$...$$
      const blockMatch = remaining.match(/^\$\$([\s\S]*?)\$\$/);
      if (blockMatch && remaining.indexOf(blockMatch[0]) === 0) {
        result.push({ type: "block", content: blockMatch[1] });
        remaining = remaining.slice(blockMatch[0].length);
        continue;
      }

      // Check for inline math $...$
      const inlineMatch = remaining.match(/^\$([^$]+?)\$/);
      if (inlineMatch && remaining.indexOf(inlineMatch[0]) === 0) {
        result.push({ type: "inline", content: inlineMatch[1] });
        remaining = remaining.slice(inlineMatch[0].length);
        continue;
      }

      // Find next math delimiter
      const nextBlock = remaining.indexOf("$$");
      const nextInline = remaining.indexOf("$");
      const nextDelim = nextBlock >= 0 && (nextInline < 0 || nextBlock <= nextInline)
        ? nextBlock
        : nextInline;

      if (nextDelim > 0) {
        result.push({ type: "text", content: remaining.slice(0, nextDelim) });
        remaining = remaining.slice(nextDelim);
      } else {
        result.push({ type: "text", content: remaining });
        break;
      }
    }

    return result;
  }, [children]);

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.content}</span>;
        }
        return (
          <LatexRenderer
            key={i}
            content={part.content}
            displayMode={part.type === "block"}
          />
        );
      })}
    </>
  );
}
