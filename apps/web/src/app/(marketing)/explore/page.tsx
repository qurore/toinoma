import { Suspense } from "react";
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
import { generatePageMetadata } from "@/lib/metadata";
import { SUBJECTS, DIFFICULTIES } from "@toinoma/shared/constants";
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
        {/* Previous */}
        {currentPage > 1 && (
          <li>
            <a
              href={buildHref(currentPage - 1)}
              className="flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
              aria-label="前のページ"
            >
              前へ
            </a>
          </li>
        )}

        {pages.map((page, idx) =>
          page === "ellipsis" ? (
            <li key={`e-${idx}`} aria-hidden="true">
              <span className="flex h-9 items-center px-2 text-sm text-muted-foreground">
                ...
              </span>
            </li>
          ) : (
            <li key={page}>
              <a
                href={buildHref(page)}
                aria-current={page === currentPage ? "page" : undefined}
                className={
                  page === currentPage
                    ? "flex h-9 min-w-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                    : "flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
                }
              >
                {page}
              </a>
            </li>
          )
        )}

        {/* Next */}
        {currentPage < totalPages && (
          <li>
            <a
              href={buildHref(currentPage + 1)}
              className="flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
              aria-label="次のページ"
            >
              次へ
            </a>
          </li>
        )}
      </ul>
    </nav>
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
  const q = params.q ?? "";
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

  // Fetch navbar data + query data in parallel
  const supabase = await createClient();
  const [navbarData, { data: userData }] = await Promise.all([
    getNavbarData(),
    supabase.auth.getUser(),
  ]);
  const userId = userData?.user?.id ?? null;

  // Build query — fetch count first for pagination
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

  const { count: totalCount } = await countQuery;
  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;

  // Build data query
  let dataQuery = supabase
    .from("problem_sets")
    .select(
      "id, title, subject, university, difficulty, price, cover_image_url, seller_id, created_at"
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

  // Sort
  switch (sort) {
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
    // popular and highest_rated will be sorted client-side after join
  }

  dataQuery = dataQuery.range(offset, offset + PAGE_SIZE - 1);
  const { data: rawSets } = await dataQuery;
  const sets = rawSets ?? [];

  // Fetch reviews aggregate + seller names + favorites in parallel
  const setIds = sets.map((s) => s.id);
  const sellerIds = [...new Set(sets.map((s) => s.seller_id))];

  const [reviewsResult, sellersResult, favoritesResult, purchasesResult] =
    await Promise.all([
      setIds.length > 0
        ? supabase
            .from("reviews")
            .select("problem_set_id, rating")
            .in("problem_set_id", setIds)
        : Promise.resolve({ data: [] }),
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
      // Purchase counts for popular sort
      sort === "popular" && setIds.length > 0
        ? supabase
            .from("purchases")
            .select("problem_set_id")
            .in("problem_set_id", setIds)
        : Promise.resolve({ data: [] }),
    ]);

  // Build lookup maps
  const reviewAggregates: Record<
    string,
    { avg: number; count: number }
  > = {};
  for (const r of reviewsResult.data ?? []) {
    const key = r.problem_set_id;
    if (!reviewAggregates[key]) {
      reviewAggregates[key] = { avg: 0, count: 0 };
    }
    reviewAggregates[key].count++;
    reviewAggregates[key].avg += r.rating;
  }
  for (const key of Object.keys(reviewAggregates)) {
    const agg = reviewAggregates[key];
    agg.avg = agg.avg / agg.count;
  }

  const sellerMap: Record<string, string> = {};
  for (const s of sellersResult.data ?? []) {
    sellerMap[s.id] = s.seller_display_name;
  }

  const favoritedIds = new Set(
    (favoritesResult.data ?? []).map(
      (f: { problem_set_id: string }) => f.problem_set_id
    )
  );

  // Build card data
  let cardData: (ProblemSetCardData & { _purchaseCount?: number })[] =
    sets.map((ps) => ({
      id: ps.id,
      title: ps.title,
      subject: ps.subject as Subject,
      difficulty: ps.difficulty as Difficulty,
      price: ps.price,
      cover_image_url: ps.cover_image_url,
      university: ps.university,
      seller_display_name: sellerMap[ps.seller_id] ?? null,
      avg_rating: reviewAggregates[ps.id]?.avg ?? null,
      review_count: reviewAggregates[ps.id]?.count ?? null,
    }));

  // Client-side sort for popular/highest_rated
  if (sort === "popular") {
    const purchaseCounts: Record<string, number> = {};
    for (const p of purchasesResult.data ?? []) {
      const key = (p as { problem_set_id: string }).problem_set_id;
      purchaseCounts[key] = (purchaseCounts[key] ?? 0) + 1;
    }
    cardData = cardData
      .map((c) => ({
        ...c,
        _purchaseCount: purchaseCounts[c.id] ?? 0,
      }))
      .sort((a, b) => (b._purchaseCount ?? 0) - (a._purchaseCount ?? 0));
  }
  if (sort === "highest_rated") {
    cardData.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
  }

  // Filter by min rating (post-query since reviews are a separate table)
  const filteredCards =
    minRating > 0
      ? cardData.filter(
          (c) => c.avg_rating != null && c.avg_rating >= minRating
        )
      : cardData;

  // Build href helper for pagination
  function buildPageHref(p: number): string {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
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

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-20 sm:px-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            問題を探す
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            大学入試対策の問題セットを見つけよう
          </p>
        </div>

        <div className="flex gap-8">
          {/* Desktop filter sidebar */}
          <Suspense fallback={null}>
            <ExploreFiltersSidebar />
          </Suspense>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Toolbar: mobile filter + sort + result count */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Suspense fallback={null}>
                  <ExploreFiltersMobile />
                </Suspense>
                <p className="text-sm text-muted-foreground">
                  {total.toLocaleString()}件の問題セット
                </p>
              </div>
              <Suspense fallback={null}>
                <ExploreSortDropdown />
              </Suspense>
            </div>

            {/* Results grid */}
            {filteredCards.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <p className="text-lg">
                  該当する問題セットが見つかりませんでした
                </p>
                <p className="mt-1 text-sm">
                  検索条件を変えてお試しください
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredCards.map((ps) => (
                    <ProblemSetCard
                      key={ps.id}
                      data={ps}
                      isFavorited={favoritedIds.has(ps.id)}
                      userId={userId}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8">
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
