import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionsLoading() {
  return (
    <div className="p-4 md:p-6">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-48" />
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Collections list */}
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
