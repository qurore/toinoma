import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-48" />
      {/* Heading + description */}
      <div className="mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-28" />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-8 w-[140px] rounded-md" />
        <Skeleton className="h-8 w-[140px] rounded-md" />
        <Skeleton className="h-8 w-[140px] rounded-md" />
      </div>

      {/* History list — cards matching the actual page layout */}
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-5 w-3/5" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
