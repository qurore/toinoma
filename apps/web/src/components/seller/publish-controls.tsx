"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Globe, EyeOff, Trash2 } from "lucide-react";
import {
  publishProblemSet,
  unpublishProblemSet,
  deleteProblemSet,
} from "@/app/(seller)/sell/actions";

export function PublishControls({
  problemSetId,
  currentStatus,
}: {
  problemSetId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attested, setAttested] = useState(false);

  const handlePublish = async () => {
    if (!attested) {
      setError("オリジナリティの確認にチェックを入れてください");
      return;
    }
    setIsLoading(true);
    setError(null);
    const result = await publishProblemSet(problemSetId, true);
    setIsLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  const handleUnpublish = async () => {
    setIsLoading(true);
    setError(null);
    const result = await unpublishProblemSet(problemSetId);
    setIsLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm("この問題セットを削除しますか？この操作は取り消せません。")) {
      return;
    }
    setIsLoading(true);
    setError(null);
    const result = await deleteProblemSet(problemSetId);
    if (result?.error) {
      setIsLoading(false);
      setError(result.error);
    }
    // deleteProblemSet redirects on success
  };

  const isPublished = currentStatus === "published";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">公開設定</CardTitle>
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? "公開中" : "下書き"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* FR-017: Originality attestation — only show when publishing */}
        {!isPublished && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
            <input
              type="checkbox"
              id={`attest-${problemSetId}`}
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <Label
              htmlFor={`attest-${problemSetId}`}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              この問題セットは自分（またはサークル）が作成したオリジナルの問題であり、
              既存の入試問題をそのまま複製したものではないことを確認します。
              問題の著作権は出題者に帰属し、利用規約に従って販売されます。
            </Label>
          </div>
        )}

        <div className="flex items-center gap-3">
          {isPublished ? (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <EyeOff className="mr-2 h-4 w-4" />
              )}
              非公開にする
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePublish}
                disabled={isLoading || !attested}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                公開する
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                削除
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
