"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Suggestion {
  id: string;
  title: string;
  subject: Subject;
  price: number;
}

interface SearchAutocompleteProps {
  /** Placeholder text */
  placeholder?: string;
  /** Additional class for the wrapper */
  className?: string;
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
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setNoResults(false);
      return;
    }

    setIsLoading(true);
    setNoResults(false);

    try {
      const supabase = createClient();
      const pattern = `%${term.trim()}%`;

      const { data } = await supabase
        .from("problem_sets")
        .select("id, title, subject, price")
        .eq("status", "published")
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(5);

      const results = (data ?? []) as Suggestion[];
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

      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    },
    [fetchSuggestions]
  );

  // Navigate to explore page on Enter
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        router.push(`/problem/${suggestions[activeIndex].id}`);
      } else if (query.trim()) {
        router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
      }
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [query, activeIndex, suggestions, router]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
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
    [isOpen, suggestions.length]
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

  const formatPrice = (price: number) =>
    price === 0 ? "無料" : `¥${price.toLocaleString()}`;

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
              if (suggestions.length > 0 || noResults) setIsOpen(true);
            }}
            placeholder={placeholder}
            role="combobox"
            aria-label="問題を検索"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls="search-suggestions"
            aria-activedescendant={
              activeIndex >= 0
                ? `search-suggestion-${activeIndex}`
                : undefined
            }
            autoComplete="off"
            className="w-full rounded-full border border-border bg-muted/50 py-1.5 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-foreground/40 focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          {noResults ? (
            <div className="px-4 py-3 text-center text-sm text-muted-foreground">
              該当する問題が見つかりませんでした
            </div>
          ) : (
            <ul className="py-1">
              {suggestions.map((item, index) => (
                <li
                  key={item.id}
                  id={`search-suggestion-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    index === activeIndex
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    // Use mousedown to fire before blur closes the dropdown
                    e.preventDefault();
                    router.push(`/problem/${item.id}`);
                    setIsOpen(false);
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
              ))}
            </ul>
          )}

          {/* Footer: search all */}
          {query.trim().length >= 2 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                router.push(
                  `/explore?q=${encodeURIComponent(query.trim())}`
                );
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <Search className="h-3 w-3" />
              「{query.trim()}」で全件検索
            </button>
          )}
        </div>
      )}
    </div>
  );
}
