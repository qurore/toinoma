"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Clock, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 6;
const MAX_RECENT_SEARCHES = 5;
const STORAGE_KEY = "toinoma_recent_searches";
const MIN_QUERY_LENGTH = 2;

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface ProblemSuggestion {
  kind: "problem";
  id: string;
  title: string;
  subject: Subject;
  price: number;
}

interface SellerSuggestion {
  kind: "seller";
  id: string;
  name: string;
  university: string | null;
}

interface SubjectSuggestion {
  kind: "subject";
  subject: Subject;
  label: string;
}

type Suggestion = ProblemSuggestion | SellerSuggestion | SubjectSuggestion;

interface SearchAutocompleteProps {
  /** Placeholder text */
  placeholder?: string;
  /** Additional class for the wrapper */
  className?: string;
}

// ──────────────────────────────────────────────
// Recent searches (localStorage)
// ──────────────────────────────────────────────

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(term: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentSearches();
    const trimmed = term.trim();
    if (!trimmed) return;
    // Deduplicate and prepend
    const updated = [trimmed, ...existing.filter((s) => s !== trimmed)].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full or blocked — silent fail
  }
}

function removeRecentSearch(term: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getRecentSearches();
    const updated = existing.filter((s) => s !== term);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silent fail
  }
}

// ──────────────────────────────────────────────
// Subject matching helper
// ──────────────────────────────────────────────

function findMatchingSubjects(term: string): SubjectSuggestion[] {
  const normalized = term.toLowerCase().trim();
  if (normalized.length < 1) return [];

  return Object.entries(SUBJECT_LABELS)
    .filter(
      ([key, label]) =>
        label.includes(normalized) ||
        key.toLowerCase().includes(normalized)
    )
    .map(([key, label]) => ({
      kind: "subject" as const,
      subject: key as Subject,
      label,
    }));
}

// ──────────────────────────────────────────────
// Price formatting
// ──────────────────────────────────────────────

function formatPrice(price: number): string {
  return price === 0 ? "無料" : `\u00A5${price.toLocaleString()}`;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function SearchAutocomplete({
  placeholder = "問題を検索...",
  className,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Total navigable items: suggestions + (search all footer if query present) + recent searches shown
  const showRecents =
    query.trim().length < MIN_QUERY_LENGTH &&
    recentSearches.length > 0 &&
    !isLoading;
  const showSearchAll =
    query.trim().length >= MIN_QUERY_LENGTH && (suggestions.length > 0 || noResults);

  const navigableItems = useMemo(() => {
    const items: {
      type: "suggestion" | "recent" | "search-all";
      index: number;
      data?: Suggestion | string;
    }[] = [];

    if (showRecents) {
      recentSearches.forEach((term, i) => {
        items.push({ type: "recent", index: i, data: term });
      });
    } else {
      suggestions.forEach((sug, i) => {
        items.push({ type: "suggestion", index: i, data: sug });
      });
      if (showSearchAll) {
        items.push({
          type: "search-all",
          index: suggestions.length,
        });
      }
    }
    return items;
  }, [showRecents, showSearchAll, recentSearches, suggestions]);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setNoResults(false);
      return;
    }

    setIsLoading(true);
    setNoResults(false);

    try {
      const supabase = createClient();
      // Escape PostgREST ilike special characters
      const escaped = term.trim().replace(/[%_\\]/g, (ch) => `\\${ch}`);
      const pattern = `%${escaped}%`;

      // Parallel fetch: problem sets + sellers
      const [problemResult, sellerResult] = await Promise.all([
        supabase
          .from("problem_sets")
          .select("id, title, subject, price")
          .eq("status", "published")
          .or(`title.ilike.${pattern},description.ilike.${pattern}`)
          .order("created_at", { ascending: false })
          .limit(MAX_SUGGESTIONS),
        supabase
          .from("seller_profiles")
          .select("id, seller_display_name, university")
          .ilike("seller_display_name", pattern)
          .limit(3),
      ]);

      const results: Suggestion[] = [];

      // Subject matches (instant, no API call)
      const subjectMatches = findMatchingSubjects(term.trim());
      results.push(...subjectMatches.slice(0, 2));

      // Problem suggestions
      for (const p of problemResult.data ?? []) {
        results.push({
          kind: "problem",
          id: p.id,
          title: p.title,
          subject: p.subject as Subject,
          price: p.price,
        });
      }

      // Seller suggestions
      for (const s of sellerResult.data ?? []) {
        results.push({
          kind: "seller",
          id: s.id,
          name: s.seller_display_name,
          university: s.university,
        });
      }

      setSuggestions(results);
      setNoResults(results.length === 0);
      setIsOpen(true);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setNoResults(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced input handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (value.trim().length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setNoResults(false);
        // Show recent searches when field is focused but query is short
        setIsOpen(true);
        return;
      }

      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, DEBOUNCE_MS);
    },
    [fetchSuggestions]
  );

  // Navigate based on the selected item
  const navigateToItem = useCallback(
    (item: Suggestion | string | undefined, fallbackQuery?: string) => {
      if (typeof item === "string") {
        // Recent search — use as query
        addRecentSearch(item);
        router.push(`/explore?q=${encodeURIComponent(item)}`);
      } else if (item) {
        switch (item.kind) {
          case "problem":
            addRecentSearch(query.trim());
            router.push(`/problem/${item.id}`);
            break;
          case "seller":
            addRecentSearch(query.trim());
            router.push(`/seller/${item.id}`);
            break;
          case "subject":
            router.push(`/explore/${item.subject}`);
            break;
        }
      } else if (fallbackQuery) {
        addRecentSearch(fallbackQuery);
        router.push(`/explore?q=${encodeURIComponent(fallbackQuery)}`);
      }
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [query, router]
  );

  // Navigate to explore page on Enter
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < navigableItems.length) {
        const item = navigableItems[activeIndex];
        if (item.type === "search-all") {
          navigateToItem(undefined, query.trim());
        } else {
          navigateToItem(item.data);
        }
      } else if (query.trim()) {
        navigateToItem(undefined, query.trim());
      }
    },
    [query, activeIndex, navigableItems, navigateToItem]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || navigableItems.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < navigableItems.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, navigableItems.length]
  );

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Remove a recent search item
  const handleRemoveRecent = useCallback(
    (term: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const updated = removeRecentSearch(term);
      setRecentSearches(updated);
      if (updated.length === 0) setIsOpen(false);
    },
    []
  );

  // Clear all recent searches
  const handleClearAllRecent = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearRecentSearches();
      setRecentSearches([]);
      setIsOpen(false);
    },
    []
  );

  const hasDropdownContent =
    showRecents || suggestions.length > 0 || noResults;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit} role="search">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              // Refresh recent searches on focus
              setRecentSearches(getRecentSearches());
              setIsOpen(true);
            }}
            placeholder={placeholder}
            role="combobox"
            aria-label="問題を検索"
            aria-expanded={isOpen && hasDropdownContent}
            aria-haspopup="listbox"
            aria-controls="search-suggestions"
            aria-activedescendant={
              activeIndex >= 0
                ? `search-item-${activeIndex}`
                : undefined
            }
            autoComplete="off"
            className="w-full rounded-full border border-border bg-muted/50 py-1.5 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-foreground/40 focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/10"
          />
          {isLoading && (
            <Loader2
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-label="検索中"
            />
          )}
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && hasDropdownContent && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          {/* Recent searches */}
          {showRecents && (
            <>
              <div className="flex items-center justify-between px-4 pb-1 pt-2.5">
                <span className="text-xs font-medium text-muted-foreground">
                  最近の検索
                </span>
                <button
                  type="button"
                  onMouseDown={handleClearAllRecent}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  すべて削除
                </button>
              </div>
              <ul className="py-1">
                {recentSearches.map((term, index) => (
                  <li
                    key={`recent-${term}`}
                    id={`search-item-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors",
                      index === activeIndex
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQuery(term);
                      navigateToItem(term);
                    }}
                  >
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{term}</span>
                    <button
                      type="button"
                      onMouseDown={(e) => handleRemoveRecent(term, e)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                      aria-label={`「${term}」を履歴から削除`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* No results */}
          {!showRecents && noResults && suggestions.length === 0 && (
            <div className="px-4 py-3 text-center text-sm text-muted-foreground">
              該当する問題が見つかりませんでした
            </div>
          )}

          {/* Categorized suggestions */}
          {!showRecents && suggestions.length > 0 && (
            <ul className="py-1">
              {/* Subject matches */}
              {suggestions.some((s) => s.kind === "subject") && (
                <li className="px-4 pb-0.5 pt-2" aria-hidden="true">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    教科
                  </span>
                </li>
              )}
              {suggestions
                .filter((s): s is SubjectSuggestion => s.kind === "subject")
                .map((item) => {
                  const itemIdx = suggestions.indexOf(item);
                  return (
                    <li
                      key={`subject-${item.subject}`}
                      id={`search-item-${itemIdx}`}
                      role="option"
                      aria-selected={itemIdx === activeIndex}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors",
                        itemIdx === activeIndex
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      )}
                      onMouseEnter={() => setActiveIndex(itemIdx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigateToItem(item);
                      }}
                    >
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1 font-medium">
                        {item.label}の問題を見る
                      </span>
                    </li>
                  );
                })}

              {/* Problem set matches */}
              {suggestions.some((s) => s.kind === "problem") && (
                <li className="px-4 pb-0.5 pt-2" aria-hidden="true">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    問題セット
                  </span>
                </li>
              )}
              {suggestions
                .filter(
                  (s): s is ProblemSuggestion => s.kind === "problem"
                )
                .map((item) => {
                  const itemIdx = suggestions.indexOf(item);
                  return (
                    <li
                      key={`problem-${item.id}`}
                      id={`search-item-${itemIdx}`}
                      role="option"
                      aria-selected={itemIdx === activeIndex}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        itemIdx === activeIndex
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      )}
                      onMouseEnter={() => setActiveIndex(itemIdx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigateToItem(item);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.title}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px]"
                      >
                        {SUBJECT_LABELS[item.subject]}
                      </Badge>
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold",
                          item.price === 0
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatPrice(item.price)}
                      </span>
                    </li>
                  );
                })}

              {/* Seller matches */}
              {suggestions.some((s) => s.kind === "seller") && (
                <li className="px-4 pb-0.5 pt-2" aria-hidden="true">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    出品者
                  </span>
                </li>
              )}
              {suggestions
                .filter(
                  (s): s is SellerSuggestion => s.kind === "seller"
                )
                .map((item) => {
                  const itemIdx = suggestions.indexOf(item);
                  return (
                    <li
                      key={`seller-${item.id}`}
                      id={`search-item-${itemIdx}`}
                      role="option"
                      aria-selected={itemIdx === activeIndex}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        itemIdx === activeIndex
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      )}
                      onMouseEnter={() => setActiveIndex(itemIdx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigateToItem(item);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        {item.university && (
                          <p className="truncate text-xs text-muted-foreground">
                            {item.university}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}

          {/* Footer: search all */}
          {showSearchAll && (
            <button
              type="button"
              id={`search-item-${suggestions.length}`}
              role="option"
              aria-selected={activeIndex === suggestions.length}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                navigateToItem(undefined, query.trim());
              }}
              className={cn(
                "flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-xs transition-colors",
                activeIndex === suggestions.length
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Search className="h-3 w-3" aria-hidden="true" />
              「{query.trim()}」で全件検索
            </button>
          )}
        </div>
      )}
    </div>
  );
}
