import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-56" />
      {/* Heading + description */}
      <div className="mb-6">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6"
          >
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>

      {/* Study streak heatmap */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-4 h-5 w-28" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>

      {/* Score trend + Subject radar */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="mb-4 h-5 w-28" />
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="mb-4 h-5 w-28" />
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
      </div>

      {/* Strengths / weaknesses */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Subject breakdown */}
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-4 h-5 w-28" />
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
