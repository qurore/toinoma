import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SiteFooter } from "@/components/navigation/site-footer";
import {
  ProblemSetCard,
  type ProblemSetCardData,
} from "@/components/marketplace/problem-set-card";
import {
  ExploreFiltersSidebar,
  ExploreFiltersMobile,
  ExploreSortDropdown,
  type SortOption,
} from "@/components/marketplace/explore-filters";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { generatePageMetadata } from "@/lib/metadata";
import { SUBJECTS, DIFFICULTIES, SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = generatePageMetadata(
  "問題を探す",
  "大学入試対策の問題セットを探そう。科目・難易度・大学別に検索できるAI採点付き問題マーケットプレイス。",
  { pathname: "/explore" }
);

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const PAGE_SIZE = 20;

// ──────────────────────────────────────────────
// Pagination component (server)
// ──────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // Build page number array with ellipsis
  const pages: (number | "ellipsis")[] = [];
  const delta = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return (
    <nav aria-label="ページナビゲーション" className="flex justify-center">
      <ul className="flex items-center gap-1">
        {/* Previous -- always rendered, disabled on page 1 for layout stability */}
        <li>
          {currentPage > 1 ? (
            <Link
              href={buildHref(currentPage - 1)}
              className="flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
              aria-label="前のページ"
            >
              前へ
            </Link>
          ) : (
            <button
              disabled
              className="flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground/40 cursor-not-allowed"
              aria-label="前のページ"
            >
              前へ
            </button>
          )}
        </li>

        {pages.map((page, idx) =>
          page === "ellipsis" ? (
            <li key={`e-${idx}`} aria-hidden="true">
              <span className="flex h-9 items-center px-2 text-sm text-muted-foreground">
                ...
              </span>
            </li>
          ) : (
            <li key={page}>
              <Link
                href={buildHref(page)}
                aria-current={page === currentPage ? "page" : undefined}
                className={
                  page === currentPage
                    ? "flex h-9 min-w-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                    : "flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
                }
              >
                {page}
              </Link>
            </li>
          )
        )}

        {/* Next -- always rendered, disabled on last page for layout stability */}
        <li>
          {currentPage < totalPages ? (
            <Link
              href={buildHref(currentPage + 1)}
              className="flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
              aria-label="次のページ"
            >
              次へ
            </Link>
          ) : (
            <button
              disabled
              className="flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground/40 cursor-not-allowed"
              aria-label="次のページ"
            >
              次へ
            </button>
          )}
        </li>
      </ul>
    </nav>
  );
}

// ──────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────

function EmptyState({ hasFilters, query }: { hasFilters: boolean; query: string }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <h2 className="text-lg font-semibold">
        該当する問題セットが見つかりませんでした
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {query
          ? `「${query}」に一致する問題セットはありません。`
          : hasFilters
            ? "フィルター条件を変更してお試しください。"
            : "まだ問題セットが公開されていません。"}
      </p>

      {/* Suggestions */}
      {hasFilters && (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/explore">
            フィルターをクリアして探す
          </Link>
        </Button>
      )}

      {/* Popular subject links */}
      <div className="mt-6">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          人気の教科から探す
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {(["math", "english", "japanese", "physics", "chemistry"] as Subject[]).map(
            (subject) => (
              <Link
                key={subject}
                href={`/explore?subject=${subject}`}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                {SUBJECT_LABELS[subject]}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const rawQ = params.q ?? "";
  // Escape PostgREST ilike wildcards AND filter syntax delimiters (commas, periods, parens)
  // to prevent filter injection via the .or() method
  const q = rawQ.replace(/[%_\\.,()]/g, (ch) => `\\${ch}`);
  const subjectParam = params.subject ?? "";
  const difficultyParam = params.difficulty ?? "";
  const freeOnly = params.free === "1";
  const priceMin = params.price_min ? parseInt(params.price_min, 10) : null;
  const priceMax = params.price_max ? parseInt(params.price_max, 10) : null;
  const minRating = params.min_rating
    ? parseInt(params.min_rating, 10)
    : 0;
  const sort = (params.sort as SortOption) || "newest";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // Parse multi-value subject/difficulty
  const subjects = subjectParam
    ? (subjectParam
        .split(",")
        .filter((s) => (SUBJECTS as readonly string[]).includes(s)) as Subject[])
    : [];
  const difficulties = difficultyParam
    ? (difficultyParam
        .split(",")
        .filter((d) =>
          (DIFFICULTIES as readonly string[]).includes(d)
        ) as Difficulty[])
    : [];

  const hasFilters =
    subjects.length > 0 ||
    difficulties.length > 0 ||
    freeOnly ||
    priceMin != null ||
    priceMax != null ||
    minRating > 0 ||
    rawQ.length > 0;

  // Fetch navbar data + query data in parallel
  const supabase = await createClient();
  const [navbarData, { data: userData }] = await Promise.all([
    getNavbarData(),
    supabase.auth.getUser(),
  ]);
  const userId = userData?.user?.id ?? null;

  // ── Build count query for pagination ──
  let countQuery = supabase
    .from("problem_sets")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  if (subjects.length === 1) {
    countQuery = countQuery.eq("subject", subjects[0]);
  } else if (subjects.length > 1) {
    countQuery = countQuery.in("subject", subjects);
  }
  if (difficulties.length === 1) {
    countQuery = countQuery.eq("difficulty", difficulties[0]);
  } else if (difficulties.length > 1) {
    countQuery = countQuery.in("difficulty", difficulties);
  }
  if (q) {
    countQuery = countQuery.or(
      `title.ilike.%${q}%,description.ilike.%${q}%`
    );
  }
  if (freeOnly) {
    countQuery = countQuery.eq("price", 0);
  } else {
    if (priceMin != null && !isNaN(priceMin)) {
      countQuery = countQuery.gte("price", priceMin);
    }
    if (priceMax != null && !isNaN(priceMax)) {
      countQuery = countQuery.lte("price", priceMax);
    }
  }
  if (minRating > 0) {
    countQuery = countQuery.gte("avg_rating", minRating);
  }

  const { count: totalCount } = await countQuery;
  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;

  // ── Build data query ──
  let dataQuery = supabase
    .from("problem_sets")
    .select(
      "id, title, subject, university, difficulty, price, cover_image_url, seller_id, created_at, purchase_count, avg_rating, review_count"
    )
    .eq("status", "published");

  if (subjects.length === 1) {
    dataQuery = dataQuery.eq("subject", subjects[0]);
  } else if (subjects.length > 1) {
    dataQuery = dataQuery.in("subject", subjects);
  }
  if (difficulties.length === 1) {
    dataQuery = dataQuery.eq("difficulty", difficulties[0]);
  } else if (difficulties.length > 1) {
    dataQuery = dataQuery.in("difficulty", difficulties);
  }
  if (q) {
    dataQuery = dataQuery.or(
      `title.ilike.%${q}%,description.ilike.%${q}%`
    );
  }
  if (freeOnly) {
    dataQuery = dataQuery.eq("price", 0);
  } else {
    if (priceMin != null && !isNaN(priceMin)) {
      dataQuery = dataQuery.gte("price", priceMin);
    }
    if (priceMax != null && !isNaN(priceMax)) {
      dataQuery = dataQuery.lte("price", priceMax);
    }
  }
  if (minRating > 0) {
    dataQuery = dataQuery.gte("avg_rating", minRating);
  }

  // Sort
  switch (sort) {
    case "popular":
      dataQuery = dataQuery.order("purchase_count", { ascending: false });
      break;
    case "highest_rated":
      dataQuery = dataQuery.order("avg_rating", { ascending: false, nullsFirst: false });
      break;
    case "price_asc":
      dataQuery = dataQuery.order("price", { ascending: true });
      break;
    case "price_desc":
      dataQuery = dataQuery.order("price", { ascending: false });
      break;
    case "newest":
    default:
      dataQuery = dataQuery.order("created_at", { ascending: false });
      break;
  }

  dataQuery = dataQuery.range(offset, offset + PAGE_SIZE - 1);
  const { data: rawSets } = await dataQuery;
  const sets = rawSets ?? [];

  // ── Fetch related data in parallel ──
  const setIds = sets.map((s) => s.id);
  const sellerIds = [...new Set(sets.map((s) => s.seller_id))];

  const [sellersResult, favoritesResult] =
    await Promise.all([
      sellerIds.length > 0
        ? supabase
            .from("seller_profiles")
            .select("id, seller_display_name")
            .in("id", sellerIds)
        : Promise.resolve({ data: [] }),
      userId && setIds.length > 0
        ? supabase
            .from("favorites")
            .select("problem_set_id")
            .eq("user_id", userId)
            .in("problem_set_id", setIds)
        : Promise.resolve({ data: [] }),
    ]);

  // ── Build lookup maps ──
  const sellerMap: Record<string, string> = {};
  for (const s of sellersResult.data ?? []) {
    sellerMap[s.id] = s.seller_display_name;
  }

  const favoritedIds = new Set(
    (favoritesResult.data ?? []).map(
      (f: { problem_set_id: string }) => f.problem_set_id
    )
  );

  // ── Build card data (aggregates come directly from the DB query) ──
  const cardData: ProblemSetCardData[] = sets.map((ps) => ({
    id: ps.id,
    title: ps.title,
    subject: ps.subject as Subject,
    difficulty: ps.difficulty as Difficulty,
    price: ps.price,
    cover_image_url: ps.cover_image_url,
    university: ps.university,
    seller_display_name: sellerMap[ps.seller_id] ?? null,
    avg_rating: ps.avg_rating ?? null,
    review_count: ps.review_count ?? null,
    purchase_count: ps.purchase_count ?? 0,
  }));

  // ── Build href helper for pagination ──
  function buildPageHref(p: number): string {
    const sp = new URLSearchParams();
    if (rawQ) sp.set("q", rawQ);
    if (subjectParam) sp.set("subject", subjectParam);
    if (difficultyParam) sp.set("difficulty", difficultyParam);
    if (freeOnly) sp.set("free", "1");
    if (priceMin != null) sp.set("price_min", String(priceMin));
    if (priceMax != null) sp.set("price_max", String(priceMax));
    if (minRating > 0) sp.set("min_rating", String(minRating));
    if (sort !== "newest") sp.set("sort", sort);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/explore?${qs}` : "/explore";
  }

  // ── Build page title based on active filters ──
  const pageTitle = subjects.length === 1
    ? `${SUBJECT_LABELS[subjects[0]]}の問題を探す`
    : rawQ
      ? `「${rawQ}」の検索結果`
      : "問題を探す";

  const pageSubtitle = subjects.length === 1
    ? `${SUBJECT_LABELS[subjects[0]]}の入試対策問題セットを見つけよう`
    : "大学入試対策の問題セットを見つけよう";

  return (
    <>
      <AppNavbar {...navbarData} />
      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 md:pb-12">
        {/* Breadcrumb */}
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "探す" },
          ]}
        />

        {/* Page header */}
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {pageTitle}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {pageSubtitle}
            </p>
          </div>
          <Link
            href="/rankings"
            className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ランキングを見る &rarr;
          </Link>
        </div>

        <div className="flex gap-8">
          {/* Desktop filter sidebar */}
          <Suspense fallback={null}>
            <ExploreFiltersSidebar />
          </Suspense>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Toolbar: mobile filter + sort + result count */}
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <Suspense fallback={null}>
                  <ExploreFiltersMobile />
                </Suspense>
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  <span className="font-semibold text-foreground">
                    {total.toLocaleString()}
                  </span>
                  <span className="ml-0.5">件</span>
                </p>
              </div>
              <Suspense fallback={null}>
                <ExploreSortDropdown />
              </Suspense>
            </div>

            {/* Results grid */}
            {cardData.length === 0 ? (
              <EmptyState hasFilters={hasFilters} query={rawQ} />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {cardData.map((ps) => (
                    <ProblemSetCard
                      key={ps.id}
                      data={ps}
                      isFavorited={favoritedIds.has(ps.id)}
                      userId={userId}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-10">
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    buildHref={buildPageHref}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
