"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AuditFiltersProps {
  currentAction: string;
  actionLabels: Record<string, string>;
}

export function AuditFilters({
  currentAction,
  actionLabels,
}: AuditFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleActionChange(value: string) {
    startTransition(() => {
      if (value === "all") {
        router.push("/admin/audit");
      } else {
        router.push(`/admin/audit?action=${value}`);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">
          アクション種別
        </Label>
        <Select value={currentAction} onValueChange={handleActionChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {Object.entries(actionLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isPending && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
