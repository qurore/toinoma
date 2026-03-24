import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground" />
      <h2 className="mb-2 text-xl font-semibold">
        出品者ページが見つかりません
      </h2>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        お探しの出品者ページは存在しません。
      </p>
      <Button asChild>
        <Link href="/sell">出品者ダッシュボードに戻る</Link>
      </Button>
    </div>
  );
}
