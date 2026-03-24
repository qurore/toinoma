import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-40" />
      {/* Page title + description */}
      <div className="mb-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-44" />
      </div>

      {/* Stats grid skeleton */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-9 w-12" />
          </div>
        ))}
      </div>

      {/* Content grid skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card"
          >
            <div className="flex items-center justify-between p-6 pb-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <div className="space-y-3 p-6 pt-4">
              {Array.from({ length: 4 }, (_, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
