import { Skeleton } from "@/components/ui/skeleton";

export default function SellerLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page title + action button skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Stats row skeleton */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-9 w-16" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Problem sets list skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
