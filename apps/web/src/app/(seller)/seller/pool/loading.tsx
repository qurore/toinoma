import { Skeleton } from "@/components/ui/skeleton";

export default function PoolLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-56" />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-1 h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Type stat badges */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>

      {/* Filter bar */}
      <Skeleton className="mb-6 h-16 w-full rounded-lg" />

      {/* Question list */}
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
          >
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
