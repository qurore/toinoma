import { Skeleton } from "@/components/ui/skeleton";

export default function RecentlyViewedLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-56" />
      {/* Heading + action */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Recently viewed grid — matching the actual page grid layout */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-12 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-2.5 h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
