/**
 * SourcePdfViewer — pinned source-PDF reference for the editor.
 *
 * Used side-by-side with StructuredEditor so creators can verify the parser's output
 * against the original. Renders via the browser's built-in PDF viewer (object/embed).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  url: string;
  title?: string;
  /** Initial page; passed via #page= URL fragment which most viewers honor. */
  initialPage?: number;
}

export function SourcePdfViewer({ url, title, initialPage }: Props) {
  const [zoom, setZoom] = useState(100);
  const objectRef = useRef<HTMLObjectElement>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const el = objectRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      // If the embed never produced a child document, fall back to a download link.
      if (!el.contentDocument && el.children.length === 0) {
        setSupported(false);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [url]);

  const fragment = initialPage ? `#page=${initialPage}` : "";

  return (
    <div className="border rounded-lg bg-card flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="text-sm font-medium truncate">
          {title ?? "ソースPDF"}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-10 text-center">{zoom}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <a href={url} download target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
      <div
        className="flex-1 overflow-auto bg-foreground/5"
        style={{ minHeight: "60vh" }}
      >
        {supported ? (
          <object
            ref={objectRef}
            data={`${url}${fragment}`}
            type="application/pdf"
            style={{
              width: `${zoom}%`,
              height: "75vh",
              minHeight: "60vh",
            }}
          >
            <FallbackLink url={url} />
          </object>
        ) : (
          <FallbackLink url={url} />
        )}
      </div>
    </div>
  );
}

function FallbackLink({ url }: { url: string }) {
  return (
    <div className="p-6 text-center text-sm">
      <p className="mb-3">
        このブラウザではPDFの埋め込み表示に対応していません。
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline"
      >
        新しいタブでPDFを開く
      </a>
    </div>
  );
}
