"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

// Sentinel value for "all" since Radix Select does not support empty string values
const ALL = "__all__";

interface PoolFilterBarProps {
  defaultSubject: string;
  defaultType: string;
  defaultQuery: string;
  hasActiveFilters: boolean;
}

export function PoolFilterBar({
  defaultSubject,
  defaultType,
  defaultQuery,
  hasActiveFilters,
}: PoolFilterBarProps) {
  const router = useRouter();
  const [subject, setSubject] = useState(defaultSubject || ALL);
  const [type, setType] = useState(defaultType || ALL);
  const [query, setQuery] = useState(defaultQuery);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (subject && subject !== ALL) params.set("subject", subject);
    if (type && type !== ALL) params.set("type", type);
    const qs = params.toString();
    router.push(qs ? `/seller/pool?${qs}` : "/seller/pool");
  }

  return (
    <form
      className="flex flex-1 flex-wrap gap-3"
      onSubmit={handleSubmit}
    >
      {/* Search input */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="問題テキストで検索..."
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Subject filter */}
      <Select value={subject} onValueChange={setSubject}>
        <SelectTrigger className="h-9 w-auto min-w-[120px]">
          <SelectValue placeholder="全科目" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全科目</SelectItem>
          <SelectItem value="math">数学</SelectItem>
          <SelectItem value="english">英語</SelectItem>
          <SelectItem value="japanese">国語</SelectItem>
          <SelectItem value="physics">物理</SelectItem>
          <SelectItem value="chemistry">化学</SelectItem>
          <SelectItem value="biology">生物</SelectItem>
          <SelectItem value="japanese_history">日本史</SelectItem>
          <SelectItem value="world_history">世界史</SelectItem>
          <SelectItem value="geography">地理</SelectItem>
        </SelectContent>
      </Select>

      {/* Question type filter */}
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="h-9 w-auto min-w-[120px]">
          <SelectValue placeholder="全タイプ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全タイプ</SelectItem>
          <SelectItem value="essay">記述式</SelectItem>
          <SelectItem value="mark_sheet">マークシート</SelectItem>
          <SelectItem value="fill_in_blank">穴埋め</SelectItem>
          <SelectItem value="multiple_choice">選択式</SelectItem>
        </SelectContent>
      </Select>

      <Button type="submit" size="sm">
        検索
      </Button>

      {/* Clear filters link — only shown when filters are active */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/seller/pool">クリア</Link>
        </Button>
      )}
    </form>
  );
}
