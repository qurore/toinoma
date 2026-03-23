"use client";

import { useState } from "react";
import { Download, FileText, FileCheck, Files } from "lucide-react";
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

  function handleDownload(type: "problems" | "answers" | "combined") {
    const url = `/api/pdf?problem_set_id=${problemSetId}&type=${type}`;
    window.open(url, "_blank");
    setIsOpen(false);
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload("problems")}>
          <FileText className="mr-2 h-4 w-4" />
          問題のみ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("answers")}>
          <FileCheck className="mr-2 h-4 w-4" />
          解答用紙のみ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("combined")}>
          <Files className="mr-2 h-4 w-4" />
          問題 + 模範解答
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
