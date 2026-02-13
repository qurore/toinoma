"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Download, Printer } from "lucide-react";

type MarginOption = "narrow" | "normal";

interface PdfPreviewProps {
  title: string;
  problemSetId: string;
  problemPdfUrl: string | null;
}

// FR-022: A4 page layout
// FR-023: Margin options
// FR-024: PDF download
export function PdfPreview({
  title,
  problemPdfUrl,
}: PdfPreviewProps) {
  const [margin, setMargin] = useState<MarginOption>("normal");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const marginStyles: Record<MarginOption, { label: string; css: string }> = {
    narrow: {
      label: "狭い（10mm）",
      css: "@page { size: A4; margin: 10mm; }",
    },
    normal: {
      label: "標準（20mm）",
      css: "@page { size: A4; margin: 20mm; }",
    },
  };

  const handlePrint = () => {
    if (!problemPdfUrl) return;

    // Open PDF in new window with print styles
    const printWindow = window.open(problemPdfUrl, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        // Inject margin styles
        const style = printWindow.document.createElement("style");
        style.textContent = marginStyles[margin].css;
        printWindow.document.head.appendChild(style);
        printWindow.print();
      });
    }
  };

  const handleDownload = () => {
    if (!problemPdfUrl) return;

    const link = document.createElement("a");
    link.href = problemPdfUrl;
    link.download = `${title}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!problemPdfUrl) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          問題PDFがアップロードされていません
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">PDFプレビュー・ダウンロード</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              印刷
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              ダウンロード
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FR-023: Margin options */}
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">余白設定:</Label>
          <div className="flex gap-2">
            {(Object.entries(marginStyles) as [MarginOption, { label: string }][]).map(
              ([key, { label }]) => (
                <Button
                  key={key}
                  variant={margin === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMargin(key)}
                >
                  {label}
                </Button>
              )
            )}
          </div>
        </div>

        {/* FR-022: A4 preview */}
        <div
          className="relative mx-auto overflow-hidden rounded-lg border bg-white shadow-sm"
          style={{
            width: "100%",
            maxWidth: "595px", // A4 width at 72 DPI
            aspectRatio: "210 / 297", // A4 ratio
          }}
        >
          <iframe
            ref={iframeRef}
            src={problemPdfUrl}
            className="h-full w-full"
            title={`PDF preview: ${title}`}
            style={{
              padding: margin === "narrow" ? "10px" : "20px",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
