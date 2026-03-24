"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportTransactionsCsv } from "./actions";

interface TransactionFiltersProps {
  sellerId: string;
  startDate: string;
  endDate: string;
}

export function TransactionFilters({
  sellerId,
  startDate,
  endDate,
}: TransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  function handleApplyFilter() {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (localStart) {
        params.set("start", localStart);
      } else {
        params.delete("start");
      }
      if (localEnd) {
        params.set("end", localEnd);
      } else {
        params.delete("end");
      }
      // Reset to page 1 when filters change
      params.delete("page");
      router.push(`/sell/transactions?${params.toString()}`);
    });
  }

  function handleClearFilter() {
    startTransition(() => {
      setLocalStart("");
      setLocalEnd("");
      router.push("/sell/transactions");
    });
  }

  async function handleExportCsv() {
    setIsExporting(true);
    try {
      const result = await exportTransactionsCsv(
        sellerId,
        localStart || null,
        localEnd || null
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.csv || result.csv.length <= 1) {
        toast.info("エクスポートするデータがありません");
        return;
      }

      // Download the CSV file
      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateRange =
        localStart || localEnd
          ? `_${localStart || "all"}_${localEnd || "all"}`
          : "";
      link.download = `toinoma_transactions${dateRange}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CSVファイルをダウンロードしました");
    } catch {
      toast.error("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="filter-start" className="text-xs">
          開始日
        </Label>
        <Input
          id="filter-start"
          type="date"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filter-end" className="text-xs">
          終了日
        </Label>
        <Input
          id="filter-end"
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          className="w-40"
        />
      </div>
      <Button
        variant="secondary"
        size="default"
        onClick={handleApplyFilter}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Search className="mr-1.5 h-4 w-4" />
        )}
        絞り込み
      </Button>
      {(startDate || endDate) && (
        <Button
          variant="ghost"
          size="default"
          onClick={handleClearFilter}
          disabled={isPending}
        >
          クリア
        </Button>
      )}
      <div className="ml-auto">
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          CSV出力
        </Button>
      </div>
    </div>
  );
}
