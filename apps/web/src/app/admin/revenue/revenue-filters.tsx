"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RevenueFiltersProps {
  startDate: string;
  endDate: string;
  viewMode: string;
  csvContent: string;
}

export function RevenueFilters({
  startDate,
  endDate,
  viewMode,
  csvContent,
}: RevenueFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    }
    router.push(`/admin/revenue?${params.toString()}`);
  }

  function handleApplyDates() {
    updateParams({ start, end });
  }

  function handleExportCsv() {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `toinoma-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      <div className="space-y-1">
        <Label htmlFor="start-date" className="text-xs text-muted-foreground">
          開始日
        </Label>
        <Input
          id="start-date"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-[160px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="end-date" className="text-xs text-muted-foreground">
          終了日
        </Label>
        <Input
          id="end-date"
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-[160px]"
        />
      </div>
      <Button variant="outline" size="sm" onClick={handleApplyDates}>
        適用
      </Button>

      <Select
        value={viewMode}
        onValueChange={(v) => updateParams({ view: v })}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">月別</SelectItem>
          <SelectItem value="daily">日別</SelectItem>
        </SelectContent>
      </Select>

      <div className="sm:ml-auto">
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          CSV出力
        </Button>
      </div>
    </div>
  );
}
