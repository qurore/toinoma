import { Suspense } from "react";
import { notFound } from "next/navigation";
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
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { generatePageMetadata } from "@/lib/metadata";
import {
  SUBJECTS,
  SUBJECT_LABELS,
  DIFFICULTIES,
} from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

function isValidSubject(value: string): value is Subject {
  return (SUBJECTS as readonly string[]).includes(value);
}

// ──────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subject: string }>;
}): Promise<Metadata> {
  const { subject } = await params;
  if (!isValidSubject(subject)) {
    return { title: "科目が見つかりません - 問の間" };
  }

  const label = SUBJECT_LABELS[subject];
  return generatePageMetadata(
    `${label}の問題を探す`,
    `${label}の大学入試対策問題セット一覧。AI採点付きで効率的に学習できます。`,
    { pathname: `/explore/${subject}` }
  );
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const PAGE_SIZE = 20;

// ──────────────────────────────────────────────
// Pagination component
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
        {currentPage > 1 && (
          <li>
            <Link
              href={buildHref(currentPage - 1)}
              className="flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
              aria-label="前のページ"
            >
              前へ
            </Link>
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

        {currentPage < totalPages && (
          <li>
            <Link
              href={buildHref(currentPage + 1)}
              className="flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
              aria-label="次のページ"
            >
              次へ
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default async function SubjectExplorePage({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { subject } = await params;
  if (!isValidSubject(subject)) notFound();

  const sp = await searchParams;
  const subjectLabel = SUBJECT_LABELS[subject];
  const rawQ = sp.q ?? "";
  // Escape PostgREST ilike wildcards AND filter syntax delimiters
  const q = rawQ.replace(/[%_\\.,()]/g, (ch) => `\\${ch}`);
  const difficultyParam = sp.difficulty ?? "";
  const freeOnly = sp.free === "1";
  const priceMin = sp.price_min ? parseInt(sp.price_min, 10) : null;
  const priceMax = sp.price_max ? parseInt(sp.price_max, 10) : null;
  const minRating = sp.min_rating ? parseInt(sp.min_rating, 10) : 0;
  const sort = (sp.sort as SortOption) || "newest";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // Parse multi-value difficulty
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

  // Build count query — always filtered by subject
  let countQuery = supabase
    .from("problem_sets")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .eq("subject", subject);

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
    .eq("status", "published")
    .eq("subject", subject);

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
      sort === "popular" && setIds.length > 0
        ? supabase
            .from("purchases")
            .select("problem_set_id")
            .in("problem_set_id", setIds)
        : Promise.resolve({ data: [] }),
    ]);

  // Build lookup maps
  const reviewAggregates: Record<string, { avg: number; count: number }> = {};
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

  // Filter by min rating
  const filteredCards =
    minRating > 0
      ? cardData.filter(
          (c) => c.avg_rating != null && c.avg_rating >= minRating
        )
      : cardData;

  // Build href helper for pagination
  function buildPageHref(p: number): string {
    const searchParamsObj = new URLSearchParams();
    if (rawQ) searchParamsObj.set("q", rawQ);
    if (difficultyParam) searchParamsObj.set("difficulty", difficultyParam);
    if (freeOnly) searchParamsObj.set("free", "1");
    if (priceMin != null) searchParamsObj.set("price_min", String(priceMin));
    if (priceMax != null) searchParamsObj.set("price_max", String(priceMax));
    if (minRating > 0) searchParamsObj.set("min_rating", String(minRating));
    if (sort !== "newest") searchParamsObj.set("sort", sort);
    if (p > 1) searchParamsObj.set("page", String(p));
    const qs = searchParamsObj.toString();
    return qs ? `/explore/${subject}?${qs}` : `/explore/${subject}`;
  }

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 md:pb-12">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "探す", href: "/explore" },
            { label: subjectLabel },
          ]}
        />

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {subjectLabel}の問題を探す
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subjectLabel}の大学入試対策問題セットを見つけよう
          </p>
        </div>

        <div className="flex gap-8">
          {/* Desktop filter sidebar */}
          <Suspense fallback={null}>
            <ExploreFiltersSidebar />
          </Suspense>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Toolbar */}
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
