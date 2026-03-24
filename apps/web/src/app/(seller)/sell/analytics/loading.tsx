import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-48" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      {/* Revenue stat cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="mt-1 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-16 shrink-0" />
              <Skeleton className="h-7 flex-1 rounded" />
              <Skeleton className="h-4 w-24 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Two-column section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="mb-4 h-5 w-28" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
