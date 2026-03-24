import { Skeleton } from "@/components/ui/skeleton";

export default function RecentlyViewedLoading() {
  return (
    <div className="p-4 md:p-6">
      <Skeleton className="mb-4 h-4 w-56" />
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Recently viewed list */}
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-5 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
            </div>
            <Skeleton className="hidden h-4 w-20 shrink-0 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
