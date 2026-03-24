import { Skeleton } from "@/components/ui/skeleton";

export default function RankingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-2 h-4 w-48" />
      <Skeleton className="mb-6 h-8 w-36" />

      {/* Subject filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-md" />
        ))}
      </div>

      {/* Rankings table */}
      <div className="overflow-hidden rounded-lg border border-border">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="hidden h-4 w-14 rounded-full sm:block" />
            <Skeleton className="hidden h-4 w-14 rounded-full md:block" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
