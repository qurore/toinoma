"use client";

import { useState } from "react";
// No decorative icons needed
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PdfDownloadButtonProps {
  problemSetId: string;
}

export function PdfDownloadButton({ problemSetId }: PdfDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handlePrint(mode: "problems" | "answers" | "combined") {
    const url = `/problem/${problemSetId}/print?mode=${mode}&margin=normal`;
    window.open(url, "_blank");
    setIsOpen(false);
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handlePrint("problems")}>
          問題のみ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePrint("answers")}>
          模範解答のみ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePrint("combined")}>
          問題 + 模範解答
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
