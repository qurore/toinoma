import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-muted-foreground/20">404</p>
      <h1 className="mt-4 text-xl font-bold tracking-tight">
        出品者が見つかりません
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        お探しの出品者プロフィールは存在しません。
      </p>
      <Button className="mt-6" size="sm" asChild>
        <Link href="/explore">問題を探す</Link>
      </Button>
    </div>
  );
}
