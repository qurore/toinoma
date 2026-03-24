"use client";

import { useState } from "react";
import { Printer, FileText, FileCheck, Files } from "lucide-react";
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
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handlePrint("problems")}>
          <FileText className="mr-2 h-4 w-4" />
          問題のみ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePrint("answers")}>
          <FileCheck className="mr-2 h-4 w-4" />
          模範解答のみ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePrint("combined")}>
          <Files className="mr-2 h-4 w-4" />
          問題 + 模範解答
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
