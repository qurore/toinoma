import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="p-4 md:p-6">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-48" />
      <Skeleton className="mb-6 h-8 w-32" />

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* History table */}
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Table header */}
        <div className="flex items-center gap-4 border-b border-border bg-muted/50 px-4 py-3">
          <Skeleton className="h-4 w-40 flex-1" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="hidden h-4 w-16 md:block" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
          >
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
            <Skeleton className="hidden h-4 w-16 md:block" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
