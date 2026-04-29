"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StructuredEditor } from "@/components/structured/structured-editor";
import { ParseJobUploader } from "@/components/structured/parse-job-uploader";
import { SourcePdfViewer } from "@/components/structured/source-pdf-viewer";
import type { Subject } from "@toinoma/shared/types";
import type { StructuredContent } from "@toinoma/shared/schemas";
import { saveStructuredContent } from "@/lib/parser/server-actions";

interface AssetRef {
  id: string;
  label: string | null;
  publicUrl: string;
  mime: string;
  alt: string | null;
}

interface Props {
  problemSetId: string;
  subject: Subject;
  initial: StructuredContent;
  sourcePdfUrl?: string;
  assets: AssetRef[];
}

export function StructuredContentClient({
  problemSetId,
  subject,
  initial,
  sourcePdfUrl,
  assets,
}: Props) {
  const [content, setContent] = useState<StructuredContent>(initial);
  const [showSource, setShowSource] = useState<boolean>(true);
  const [pending, startTransition] = useTransition();
  const [showImport, setShowImport] = useState(false);

  const assetMap = useMemo(() => {
    const map: Record<string, { url: string; alt?: string; mime?: string }> = {};
    for (const a of assets) {
      map[a.id] = { url: a.publicUrl, alt: a.alt ?? undefined, mime: a.mime };
      if (a.label) {
        map[a.label] = { url: a.publicUrl, alt: a.alt ?? undefined, mime: a.mime };
      }
    }
    return map;
  }, [assets]);

  const onSave = (next: StructuredContent) =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await saveStructuredContent(problemSetId, next);
        if (res.ok) {
          toast.success("保存しました");
        } else {
          toast.error(`保存に失敗しました: ${res.error}`);
        }
        resolve();
      });
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showImport ? "default" : "outline"}
          onClick={() => setShowImport((s) => !s)}
        >
          PDF/DOCXインポート
        </Button>
        {sourcePdfUrl && (
          <Button
            variant="outline"
            onClick={() => setShowSource((s) => !s)}
          >
            {showSource ? "ソースを隠す" : "ソースを表示"}
          </Button>
        )}
        <div className="ms-auto text-sm text-foreground/60">
          ブロック数: {content.body.length} / モード:{" "}
          {content.defaultWritingMode === "vertical" ? "縦書き" : "横書き"}
        </div>
      </div>

      {showImport && (
        <div className="border rounded-lg p-4 bg-card">
          <ParseJobUploader
            problemSetId={problemSetId}
            subject={subject}
            onComplete={(ast) => {
              setContent(ast);
              setShowImport(false);
              const blocks = ast.body.length;
              const mode =
                ast.defaultWritingMode === "vertical" ? "縦書き" : "横書き";
              toast.success(
                `解析完了: ${blocks}ブロック（${mode}）。確認のうえ保存してください。`,
              );
            }}
            onFail={(message) => toast.error(`解析失敗: ${message}`)}
          />
        </div>
      )}

      <div
        className={
          showSource && sourcePdfUrl
            ? "grid grid-cols-1 xl:grid-cols-2 gap-4"
            : ""
        }
      >
        <div>
          <StructuredEditor
            initial={content}
            assets={assetMap}
            onChange={setContent}
            onSave={onSave}
            saving={pending}
          />
        </div>
        {showSource && sourcePdfUrl && (
          <div>
            <SourcePdfViewer url={sourcePdfUrl} title="ソースPDF" />
          </div>
        )}
      </div>
    </div>
  );
}
