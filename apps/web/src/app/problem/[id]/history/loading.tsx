import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-12 pt-20 sm:px-6">
      {/* Breadcrumbs */}
      <Skeleton className="mb-6 h-4 w-56" />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Statistics cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex flex-col items-center rounded-lg border border-border bg-card py-4"
          >
            <Skeleton className="mb-1.5 h-5 w-5 rounded" />
            <Skeleton className="mb-1 h-3 w-14" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Submission list */}
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-1 h-3 w-36" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-7 w-12 rounded-md" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
