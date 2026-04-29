/**
 * StructuredContentView — top-level renderer.
 *
 * Reads a StructuredContent AST and renders it as a self-contained DOM tree.
 * Decides writing-mode (vertical vs horizontal) based on the AST's defaultWritingMode,
 * with the option for callers to override per-passage.
 */
"use client";

import { useCallback, useMemo, useRef } from "react";
import type { StructuredContent, Question } from "@toinoma/shared/schemas";
import { BlockList, anchorId } from "./block-renderers";
import type { BlockCtx } from "./block-renderers";

export interface AssetMap {
  [assetId: string]: {
    url: string;
    alt?: string;
    mime?: string;
  };
}

export interface StructuredContentViewProps {
  content: StructuredContent;
  assets?: AssetMap;
  /** When provided, replaces the default question rendering inside question_group blocks. */
  renderQuestion?: (q: Question) => React.ReactNode;
  /** Disable interactive jumps (used in editor previews). */
  inert?: boolean;
  /** Additional class names on the outer wrapper. */
  className?: string;
}

export function StructuredContentView({
  content,
  assets,
  renderQuestion,
  inert,
  className,
}: StructuredContentViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const resolveAsset = useCallback(
    (assetId: string): string | undefined => {
      return assets?.[assetId]?.url;
    },
    [assets],
  );

  const scrollTo = useCallback((selector: string) => {
    const el = rootRef.current?.querySelector(selector);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const ctx: BlockCtx = useMemo(() => {
    return {
      resolveAsset,
      renderQuestion,
      inert,
      onMarkerJump: (m) => scrollTo(`[data-marker="${cssEscape(m)}"]`),
      onFootnoteJump: (r) => scrollTo(`#${anchorId("footnote", r)}`),
      onFigureJump: (label) =>
        scrollTo(`#${anchorId("figure", label)}, #${anchorId("table", label)}`),
      onBlankJump: (id) => scrollTo(`[data-blank-id="${cssEscape(id)}"]`),
    };
  }, [resolveAsset, renderQuestion, inert, scrollTo]);

  const verticalRoot = content.defaultWritingMode === "vertical";

  return (
    <div
      ref={rootRef}
      className={`structured-content ${verticalRoot ? "structured-vertical" : ""} ${className ?? ""}`}
      data-default-writing-mode={content.defaultWritingMode}
      data-default-lang={content.defaultLang}
      lang={content.defaultLang === "en" ? "en" : "ja"}
    >
      <BlockList nodes={content.body} ctx={ctx} />
    </div>
  );
}

function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/[^a-zA-Z0-9_\-぀-ゟ゠-ヿ一-鿿]/g, "\\$&");
}
