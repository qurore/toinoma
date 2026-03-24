import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <Skeleton className="h-8 w-48" />

      {/* Stat cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-9 w-16" />
            <Skeleton className="mt-1 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6"
          >
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-40 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
