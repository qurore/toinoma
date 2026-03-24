"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SUBJECTS, SUBJECT_LABELS, DIFFICULTIES, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type SortOption =
  | "newest"
  | "popular"
  | "highest_rated"
  | "price_asc"
  | "price_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "popular", label: "人気順" },
  { value: "highest_rated", label: "評価順" },
  { value: "price_asc", label: "価格が安い順" },
  { value: "price_desc", label: "価格が高い順" },
];

export interface FilterState {
  subjects: Subject[];
  difficulties: Difficulty[];
  freeOnly: boolean;
  priceMin: string;
  priceMax: string;
  minRating: number;
  sort: SortOption;
  q: string;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function parseFilterStateFromParams(
  params: URLSearchParams
): FilterState {
  const subjectParam = params.get("subject") ?? "";
  const difficultyParam = params.get("difficulty") ?? "";
  const subjects = subjectParam
    ? (subjectParam.split(",").filter((s) =>
        (SUBJECTS as readonly string[]).includes(s)
      ) as Subject[])
    : [];
  const difficulties = difficultyParam
    ? (difficultyParam.split(",").filter((d) =>
        (DIFFICULTIES as readonly string[]).includes(d)
      ) as Difficulty[])
    : [];

  return {
    subjects,
    difficulties,
    freeOnly: params.get("free") === "1",
    priceMin: params.get("price_min") ?? "",
    priceMax: params.get("price_max") ?? "",
    minRating: parseInt(params.get("min_rating") ?? "0", 10) || 0,
    sort: (params.get("sort") as SortOption) || "newest",
    q: params.get("q") ?? "",
  };
}

function buildSearchParams(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.subjects.length > 0) params.set("subject", state.subjects.join(","));
  if (state.difficulties.length > 0) params.set("difficulty", state.difficulties.join(","));
  if (state.freeOnly) params.set("free", "1");
  if (state.priceMin) params.set("price_min", state.priceMin);
  if (state.priceMax) params.set("price_max", state.priceMax);
  if (state.minRating > 0) params.set("min_rating", String(state.minRating));
  if (state.sort !== "newest") params.set("sort", state.sort);
  // Always reset to page 1 on filter change
  return params;
}

// ──────────────────────────────────────────────
// Filter content (shared between sidebar and sheet)
// ──────────────────────────────────────────────

function FilterContent({
  state,
  onChange,
  onApply,
  onClear,
}: {
  state: FilterState;
  onChange: (update: Partial<FilterState>) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const hasActiveFilters =
    state.subjects.length > 0 ||
    state.difficulties.length > 0 ||
    state.freeOnly ||
    state.priceMin !== "" ||
    state.priceMax !== "" ||
    state.minRating > 0;

  return (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">並び替え</h3>
        <Select
          value={state.sort}
          onValueChange={(v) => onChange({ sort: v as SortOption })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Subject checkboxes */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">教科</h3>
        <div className="space-y-2">
          {SUBJECTS.map((subject) => {
            const checked = state.subjects.includes(subject);
            return (
              <div key={subject} className="flex items-center gap-2">
                <Checkbox
                  id={`subject-${subject}`}
                  checked={checked}
                  onCheckedChange={(val) => {
                    const next = val
                      ? [...state.subjects, subject]
                      : state.subjects.filter((s) => s !== subject);
                    onChange({ subjects: next });
                  }}
                />
                <Label
                  htmlFor={`subject-${subject}`}
                  className="cursor-pointer text-sm"
                >
                  {SUBJECT_LABELS[subject]}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Difficulty checkboxes */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">難易度</h3>
        <div className="space-y-2">
          {DIFFICULTIES.map((diff) => {
            const checked = state.difficulties.includes(diff);
            return (
              <div key={diff} className="flex items-center gap-2">
                <Checkbox
                  id={`difficulty-${diff}`}
                  checked={checked}
                  onCheckedChange={(val) => {
                    const next = val
                      ? [...state.difficulties, diff]
                      : state.difficulties.filter((d) => d !== diff);
                    onChange({ difficulties: next });
                  }}
                />
                <Label
                  htmlFor={`difficulty-${diff}`}
                  className="cursor-pointer text-sm"
                >
                  {DIFFICULTY_LABELS[diff]}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Price range */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">価格</h3>
        <div className="mb-3 flex items-center gap-2">
          <Checkbox
            id="free-only"
            checked={state.freeOnly}
            onCheckedChange={(val) =>
              onChange({ freeOnly: !!val, priceMin: "", priceMax: "" })
            }
          />
          <Label htmlFor="free-only" className="cursor-pointer text-sm">
            無料のみ
          </Label>
        </div>
        {!state.freeOnly && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="100"
              placeholder="¥ 下限"
              value={state.priceMin}
              onChange={(e) => onChange({ priceMin: e.target.value })}
              className="h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">〜</span>
            <Input
              type="number"
              min="0"
              step="100"
              placeholder="¥ 上限"
              value={state.priceMax}
              onChange={(e) => onChange({ priceMax: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Minimum rating */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">最低評価</h3>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() =>
                onChange({ minRating: state.minRating === star ? 0 : star })
              }
              className="p-0.5 transition-transform hover:scale-110"
              aria-label={`${star}星以上`}
            >
              <Star
                className={cn(
                  "h-5 w-5",
                  star <= state.minRating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
          {state.minRating > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              {state.minRating}以上
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button onClick={onApply} className="flex-1" size="sm">
          適用する
        </Button>
        {hasActiveFilters && (
          <Button onClick={onClear} variant="outline" size="sm">
            クリア
          </Button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Desktop sidebar
// ──────────────────────────────────────────────

export function ExploreFiltersSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FilterState>(() =>
    parseFilterStateFromParams(searchParams)
  );

  const handleChange = useCallback((update: Partial<FilterState>) => {
    setState((prev) => ({ ...prev, ...update }));
  }, []);

  const handleApply = useCallback(() => {
    startTransition(() => {
      const params = buildSearchParams(state);
      router.push(`/explore?${params.toString()}`);
    });
  }, [state, router]);

  const handleClear = useCallback(() => {
    const cleared: FilterState = {
      subjects: [],
      difficulties: [],
      freeOnly: false,
      priceMin: "",
      priceMax: "",
      minRating: 0,
      sort: "newest",
      q: state.q, // preserve search query
    };
    setState(cleared);
    startTransition(() => {
      const params = buildSearchParams(cleared);
      router.push(`/explore?${params.toString()}`);
    });
  }, [state.q, router]);

  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 lg:block",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <div className="sticky top-20 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
          <SlidersHorizontal className="h-4 w-4" />
          フィルター
        </h2>
        <FilterContent
          state={state}
          onChange={handleChange}
          onApply={handleApply}
          onClear={handleClear}
        />
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────
// Mobile bottom sheet
// ──────────────────────────────────────────────

export function ExploreFiltersMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<FilterState>(() =>
    parseFilterStateFromParams(searchParams)
  );

  const activeFilterCount =
    state.subjects.length +
    state.difficulties.length +
    (state.freeOnly ? 1 : 0) +
    (state.priceMin ? 1 : 0) +
    (state.priceMax ? 1 : 0) +
    (state.minRating > 0 ? 1 : 0);

  const handleChange = useCallback((update: Partial<FilterState>) => {
    setState((prev) => ({ ...prev, ...update }));
  }, []);

  const handleApply = useCallback(() => {
    startTransition(() => {
      const params = buildSearchParams(state);
      router.push(`/explore?${params.toString()}`);
    });
    setIsOpen(false);
  }, [state, router]);

  const handleClear = useCallback(() => {
    const cleared: FilterState = {
      subjects: [],
      difficulties: [],
      freeOnly: false,
      priceMin: "",
      priceMax: "",
      minRating: 0,
      sort: "newest",
      q: state.q,
    };
    setState(cleared);
    startTransition(() => {
      const params = buildSearchParams(cleared);
      router.push(`/explore?${params.toString()}`);
    });
    setIsOpen(false);
  }, [state.q, router]);

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>フィルター</span>
        {activeFilterCount > 0 && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {/* Backdrop + Sheet */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-5 shadow-lg lg:hidden",
              isPending && "opacity-50 pointer-events-none"
            )}
            role="dialog"
            aria-label="フィルター"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <SlidersHorizontal className="h-4 w-4" />
                フィルター
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                aria-label="閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drag indicator */}
            <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/20" />

            <FilterContent
              state={state}
              onChange={handleChange}
              onApply={handleApply}
              onClear={handleClear}
            />
          </div>
        </>
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// Sort dropdown (standalone for top bar use)
// ──────────────────────────────────────────────

export function ExploreSortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = (searchParams.get("sort") as SortOption) || "newest";

  const handleChange = useCallback(
    (value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "newest") {
          params.delete("sort");
        } else {
          params.set("sort", value);
        }
        params.delete("page"); // Reset page on sort change
        router.push(`/explore?${params.toString()}`);
      });
    },
    [searchParams, router]
  );

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger
        className={cn("w-40 h-8 text-xs", isPending && "opacity-50")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
