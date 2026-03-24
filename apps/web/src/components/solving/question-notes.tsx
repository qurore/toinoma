"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { StickyNote, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface QuestionNotesProps {
  /** Current user ID */
  userId: string;
  /** Problem set this note belongs to */
  problemSetId: string;
  /** Optional question identifier within the problem set */
  questionId?: string | null;
  /** Initial note content (pre-fetched from server) */
  initialContent?: string;
  /** Existing note ID if already saved */
  initialNoteId?: string | null;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function QuestionNotes({
  userId,
  problemSetId,
  questionId = null,
  initialContent = "",
  initialNoteId = null,
}: QuestionNotesProps) {
  const [expanded, setExpanded] = useState(initialContent.length > 0);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(initialNoteId);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef(initialContent);

  // Clean up saved indicator timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const saveNote = useCallback(async () => {
    const trimmed = content.trim();

    // Skip save if content hasn't changed
    if (trimmed === lastSavedContent.current.trim()) return;

    setSaving(true);
    setSaved(false);

    try {
      // NOTE: user_notes table is defined in migration 20260323400000
      // but not yet in generated Supabase types. Using typed casts.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;

      if (noteId && trimmed.length === 0) {
        // Delete empty note
        await supabase.from("user_notes").delete().eq("id", noteId);
        setNoteId(null);
        lastSavedContent.current = "";
      } else if (noteId) {
        // Update existing note
        await supabase
          .from("user_notes")
          .update({ content: trimmed })
          .eq("id", noteId);
        lastSavedContent.current = trimmed;
      } else if (trimmed.length > 0) {
        // Create new note
        const { data } = await supabase
          .from("user_notes")
          .insert({
            user_id: userId,
            problem_set_id: problemSetId,
            question_id: questionId,
            content: trimmed,
          })
          .select("id")
          .single();

        if (data) {
          setNoteId((data as { id: string }).id);
        }
        lastSavedContent.current = trimmed;
      }

      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch {
      // Silently fail — user can retry on next blur
    } finally {
      setSaving(false);
    }
  }, [content, noteId, userId, problemSetId, questionId]);

  const handleBlur = useCallback(() => {
    saveNote();
  }, [saveNote]);

  const hasContent = content.trim().length > 0;

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header — always visible */}
      <Button
        variant="ghost"
        className="flex w-full items-center justify-between px-3 py-2 text-sm"
        onClick={() => setExpanded((prev) => !prev)}
        type="button"
      >
        <span className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-500" />
          <span className="font-medium">メモ</span>
          {hasContent && !expanded && (
            <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              1
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {saving && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {saved && (
            <span className="text-xs text-emerald-600">保存済み</span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      </Button>

      {/* Expandable textarea */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            placeholder="この問題についてのメモを入力..."
            className={cn(
              "min-h-[100px] resize-y text-sm",
              "border-transparent bg-muted/50 focus-visible:border-input focus-visible:bg-background"
            )}
            aria-label="問題メモ"
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            入力欄から離れると自動保存されます
          </p>
        </div>
      )}
    </div>
  );
}
