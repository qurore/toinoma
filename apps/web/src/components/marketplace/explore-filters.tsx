"use client";

import { useState, useCallback, useTransition, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Star, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  SUBJECTS,
  SUBJECT_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
} from "@toinoma/shared/constants";
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
  q: string;
}

export const EMPTY_FILTER: FilterState = {
  subjects: [],
  difficulties: [],
  freeOnly: false,
  priceMin: "",
  priceMax: "",
  minRating: 0,
  q: "",
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

export function parseFilterStateFromParams(params: URLSearchParams): FilterState {
  const subjectParam = params.get("subject") ?? "";
  const difficultyParam = params.get("difficulty") ?? "";
  const subjects = subjectParam
    ? (subjectParam
        .split(",")
        .filter((s) =>
          (SUBJECTS as readonly string[]).includes(s)
        ) as Subject[])
    : [];
  const difficulties = difficultyParam
    ? (difficultyParam
        .split(",")
        .filter((d) =>
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
    q: params.get("q") ?? "",
  };
}

export function buildSearchParams(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.subjects.length > 0)
    params.set("subject", state.subjects.join(","));
  if (state.difficulties.length > 0)
    params.set("difficulty", state.difficulties.join(","));
  if (state.freeOnly) params.set("free", "1");
  if (state.priceMin) params.set("price_min", state.priceMin);
  if (state.priceMax) params.set("price_max", state.priceMax);
  if (state.minRating > 0) params.set("min_rating", String(state.minRating));
  // Always reset to page 1 on filter change
  return params;
}

function countActiveFilters(state: FilterState): number {
  return (
    state.subjects.length +
    state.difficulties.length +
    (state.freeOnly ? 1 : 0) +
    (state.priceMin ? 1 : 0) +
    (state.priceMax ? 1 : 0) +
    (state.minRating > 0 ? 1 : 0)
  );
}

/** Build a human-readable list of active filter descriptions for aria */
function describeActiveFilters(state: FilterState): string {
  const parts: string[] = [];
  if (state.subjects.length > 0) {
    parts.push(state.subjects.map((s) => SUBJECT_LABELS[s]).join("、"));
  }
  if (state.difficulties.length > 0) {
    parts.push(state.difficulties.map((d) => DIFFICULTY_LABELS[d]).join("、"));
  }
  if (state.freeOnly) parts.push("無料のみ");
  if (state.priceMin) parts.push(`¥${state.priceMin}以上`);
  if (state.priceMax) parts.push(`¥${state.priceMax}以下`);
  if (state.minRating > 0) parts.push(`${state.minRating}星以上`);
  return parts.length > 0 ? parts.join("、") : "なし";
}

// ──────────────────────────────────────────────
// Active filter chips
// ──────────────────────────────────────────────

function ActiveFilterChips({
  state,
  onChange,
}: {
  state: FilterState;
  onChange: (update: Partial<FilterState>) => void;
}) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  for (const subject of state.subjects) {
    chips.push({
      key: `subject-${subject}`,
      label: SUBJECT_LABELS[subject],
      onRemove: () =>
        onChange({
          subjects: state.subjects.filter((s) => s !== subject),
        }),
    });
  }

  for (const diff of state.difficulties) {
    chips.push({
      key: `difficulty-${diff}`,
      label: DIFFICULTY_LABELS[diff],
      onRemove: () =>
        onChange({
          difficulties: state.difficulties.filter((d) => d !== diff),
        }),
    });
  }

  if (state.freeOnly) {
    chips.push({
      key: "free",
      label: "無料のみ",
      onRemove: () => onChange({ freeOnly: false }),
    });
  }

  if (state.priceMin) {
    chips.push({
      key: "price-min",
      label: `¥${state.priceMin}以上`,
      onRemove: () => onChange({ priceMin: "" }),
    });
  }

  if (state.priceMax) {
    chips.push({
      key: "price-max",
      label: `¥${state.priceMax}以下`,
      onRemove: () => onChange({ priceMax: "" }),
    });
  }

  if (state.minRating > 0) {
    chips.push({
      key: "rating",
      label: `${state.minRating}星以上`,
      onRemove: () => onChange({ minRating: 0 }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="適用中のフィルター">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 pr-1 text-xs"
          role="listitem"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`${chip.label}フィルターを削除`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Filter content (shared between sidebar and sheet)
// ──────────────────────────────────────────────

function FilterContent({
  state,
  onChange,
  onApply,
  onClear,
  showApplyButton,
}: {
  state: FilterState;
  onChange: (update: Partial<FilterState>) => void;
  onApply: () => void;
  onClear: () => void;
  showApplyButton: boolean;
}) {
  const hasActiveFilters = countActiveFilters(state) > 0;

  return (
    <div className="space-y-6" role="form" aria-label="検索フィルター">
      {/* Active filter chips */}
      <ActiveFilterChips state={state} onChange={onChange} />

      {/* Subject checkboxes */}
      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold">教科</legend>
        <div className="space-y-2.5">
          {SUBJECTS.map((subject) => {
            const checked = state.subjects.includes(subject);
            return (
              <div key={subject} className="flex items-center gap-2.5">
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
                  className="cursor-pointer text-sm leading-none"
                >
                  {SUBJECT_LABELS[subject]}
                </Label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <Separator />

      {/* Difficulty checkboxes */}
      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold">難易度</legend>
        <div className="space-y-2.5">
          {DIFFICULTIES.map((diff) => {
            const checked = state.difficulties.includes(diff);
            return (
              <div key={diff} className="flex items-center gap-2.5">
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
                  className="cursor-pointer text-sm leading-none"
                >
                  {DIFFICULTY_LABELS[diff]}
                </Label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <Separator />

      {/* Price range */}
      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold">価格</legend>
        <div className="mb-3 flex items-center gap-2.5">
          <Checkbox
            id="free-only"
            checked={state.freeOnly}
            onCheckedChange={(val) =>
              onChange({ freeOnly: !!val, priceMin: "", priceMax: "" })
            }
          />
          <Label
            htmlFor="free-only"
            className="cursor-pointer text-sm leading-none"
          >
            無料のみ
          </Label>
        </div>
        {!state.freeOnly && (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="¥ 下限"
              value={state.priceMin}
              onChange={(e) => {
                const v = e.target.value;
                const n = parseInt(v, 10);
                if (v === "" || (Number.isInteger(n) && n >= 0)) {
                  onChange({ priceMin: v === "" ? "" : String(n) });
                }
              }}
              className="h-9 text-sm"
              aria-label="最低価格"
            />
            <span className="shrink-0 text-xs text-muted-foreground" aria-hidden="true">
              〜
            </span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="¥ 上限"
              value={state.priceMax}
              onChange={(e) => {
                const v = e.target.value;
                const n = parseInt(v, 10);
                if (v === "" || (Number.isInteger(n) && n >= 0)) {
                  onChange({ priceMax: v === "" ? "" : String(n) });
                }
              }}
              className="h-9 text-sm"
              aria-label="最高価格"
            />
          </div>
        )}
      </fieldset>

      <Separator />

      {/* Minimum rating */}
      <div>
        <h3 className="mb-2.5 text-sm font-semibold" id="filter-rating-label">
          最低評価
        </h3>
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-labelledby="filter-rating-label"
          onKeyDown={(e) => {
            const stars = [1, 2, 3, 4, 5];
            const currentIdx = stars.indexOf(state.minRating);
            let nextIdx = -1;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              nextIdx = currentIdx < 4 ? currentIdx + 1 : 0;
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              nextIdx = currentIdx > 0 ? currentIdx - 1 : 4;
            }
            if (nextIdx >= 0) {
              onChange({ minRating: stars[nextIdx] });
              const target = e.currentTarget.querySelectorAll<HTMLElement>("[role=radio]")[nextIdx];
              target?.focus();
            }
          }}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const isSelected = state.minRating === star;
            const isFirst = star === 1;
            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (state.minRating === 0 && isFirst) ? 0 : -1}
                onClick={() =>
                  onChange({
                    minRating: state.minRating === star ? 0 : star,
                  })
                }
                className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${star}星以上`}
              >
                <Star
                  className={cn(
                    "h-5 w-5 transition-colors",
                    star <= state.minRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  )}
                />
              </button>
            );
          })}
          {state.minRating > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {state.minRating}以上
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Action buttons */}
      <div className="flex gap-2">
        {showApplyButton && (
          <Button onClick={onApply} className="flex-1" size="sm">
            適用する
          </Button>
        )}
        {hasActiveFilters && (
          <Button
            onClick={onClear}
            variant="outline"
            size={showApplyButton ? "sm" : "default"}
            className={showApplyButton ? "" : "w-full"}
          >
            <RotateCcw className="mr-1.5 h-3 w-3" />
            すべてクリア
          </Button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Desktop sidebar (auto-applies on change)
// ──────────────────────────────────────────────

export function ExploreFiltersSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FilterState>(() =>
    parseFilterStateFromParams(searchParams)
  );

  // Ref that always holds the latest state — prevents stale closure in handleChange
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Guard flag: skip redundant useEffect sync when navigation was self-initiated
  const isInternalNavigation = useRef(false);

  // Sync local filter state when URL searchParams change externally (e.g., back/forward navigation).
  // This is a valid use of setState in an effect — we are subscribing to an external system (the URL).
  useEffect(() => {
    if (isInternalNavigation.current) {
      isInternalNavigation.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from external URL state
    setState(parseFilterStateFromParams(searchParams));
  }, [searchParams]);

  const handleChange = useCallback(
    (update: Partial<FilterState>) => {
      const next = { ...stateRef.current, ...update };
      setState(next);
      isInternalNavigation.current = true;
      startTransition(() => {
        const params = buildSearchParams(next);
        // Preserve sort param since it's managed by ExploreSortDropdown
        const currentSort = new URLSearchParams(window.location.search).get("sort");
        if (currentSort) params.set("sort", currentSort);
        router.push(`/explore?${params.toString()}`);
      });
    },
    [router]
  );

  const handleApply = useCallback(() => {
    isInternalNavigation.current = true;
    startTransition(() => {
      const params = buildSearchParams(stateRef.current);
      const currentSort = new URLSearchParams(window.location.search).get("sort");
      if (currentSort) params.set("sort", currentSort);
      router.push(`/explore?${params.toString()}`);
    });
  }, [router]);

  const handleClear = useCallback(() => {
    const cleared: FilterState = {
      ...EMPTY_FILTER,
      q: stateRef.current.q,
    };
    setState(cleared);
    isInternalNavigation.current = true;
    startTransition(() => {
      const params = buildSearchParams(cleared);
      const currentSort = new URLSearchParams(window.location.search).get("sort");
      if (currentSort) params.set("sort", currentSort);
      router.push(`/explore?${params.toString()}`);
    });
  }, [router]);

  return (
    <aside
      aria-label="検索フィルター"
      className={cn(
        "hidden w-64 shrink-0 lg:block",
        isPending && "pointer-events-none opacity-50"
      )}
    >
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-border bg-card p-4 scrollbar-thin">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          フィルター
        </h2>
        <FilterContent
          state={state}
          onChange={handleChange}
          onApply={handleApply}
          onClear={handleClear}
          showApplyButton={false}
        />
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────
// Mobile bottom sheet (manual apply)
// ──────────────────────────────────────────────

export function ExploreFiltersMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<FilterState>(() =>
    parseFilterStateFromParams(searchParams)
  );

  // Ref that always holds the latest state — prevents stale closure in handleChange
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Guard flag: skip redundant useEffect sync when navigation was self-initiated
  const isInternalNavigation = useRef(false);

  // Sync local filter state when URL searchParams change externally (e.g., back/forward navigation).
  // This is a valid use of setState in an effect — we are subscribing to an external system (the URL).
  useEffect(() => {
    if (isInternalNavigation.current) {
      isInternalNavigation.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from external URL state
    setState(parseFilterStateFromParams(searchParams));
  }, [searchParams]);

  const activeFilterCount = countActiveFilters(state);
  const activeFilterDescription = useMemo(
    () => describeActiveFilters(state),
    [state]
  );

  const handleChange = useCallback((update: Partial<FilterState>) => {
    const next = { ...stateRef.current, ...update };
    setState(next);
  }, []);

  const handleApply = useCallback(() => {
    isInternalNavigation.current = true;
    startTransition(() => {
      const params = buildSearchParams(stateRef.current);
      const currentSort = new URLSearchParams(window.location.search).get("sort");
      if (currentSort) params.set("sort", currentSort);
      router.push(`/explore?${params.toString()}`);
    });
    setIsOpen(false);
  }, [router]);

  const handleClear = useCallback(() => {
    const cleared: FilterState = {
      ...EMPTY_FILTER,
      q: stateRef.current.q,
    };
    setState(cleared);
    isInternalNavigation.current = true;
    startTransition(() => {
      const params = buildSearchParams(cleared);
      const currentSort = new URLSearchParams(window.location.search).get("sort");
      if (currentSort) params.set("sort", currentSort);
      router.push(`/explore?${params.toString()}`);
    });
    setIsOpen(false);
  }, [router]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger button */}
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          aria-label={`フィルター${activeFilterCount > 0 ? ` (${activeFilterCount}件適用中: ${activeFilterDescription})` : ""}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>フィルター</span>
          {activeFilterCount > 0 && (
            <span
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              aria-hidden="true"
            >
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      {/* Sheet content slides up from the bottom */}
      <SheetContent
        side="bottom"
        className={cn(
          "max-h-[85vh] overflow-y-auto rounded-t-2xl scrollbar-thin",
          isPending && "pointer-events-none opacity-50"
        )}
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-sm font-bold">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            フィルター
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {activeFilterCount}件
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            検索結果を絞り込むフィルターです
          </SheetDescription>
        </SheetHeader>

        <FilterContent
          state={state}
          onChange={handleChange}
          onApply={handleApply}
          onClear={handleClear}
          showApplyButton={true}
        />
      </SheetContent>
    </Sheet>
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
        className={cn("h-9 w-40 text-sm", isPending && "opacity-50")}
        aria-label="並び替え"
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
