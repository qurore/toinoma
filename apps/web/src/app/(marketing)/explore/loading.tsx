import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-20 sm:px-6">
      {/* Page header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>

      <div className="flex gap-8">
        {/* Desktop filter sidebar skeleton */}
        <div className="hidden w-64 shrink-0 lg:block">
          <div className="space-y-6 rounded-xl border border-border bg-card p-5">
            {/* Filter header */}
            <Skeleton className="h-5 w-24" />

            {/* Sort section */}
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>

            {/* Subject section */}
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-12" />
              {Array.from({ length: 5 }, (_, j) => (
                <div key={j} className="flex items-center gap-2.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>

            {/* Difficulty section */}
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-14" />
              {Array.from({ length: 3 }, (_, j) => (
                <div key={j} className="flex items-center gap-2.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>

            {/* Price section */}
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-10" />
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="min-w-0 flex-1">
          {/* Toolbar skeleton */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-24 rounded-md lg:hidden" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>

          {/* Card grid skeleton */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <Skeleton className="h-40 w-full rounded-none sm:h-44" />
                <div className="p-4">
                  <div className="mb-2 flex gap-1.5">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-1 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-28" />
                  <Skeleton className="mt-1.5 h-3 w-20" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="mt-8 flex justify-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
