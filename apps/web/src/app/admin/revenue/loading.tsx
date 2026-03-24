import { Skeleton } from "@/components/ui/skeleton";

export default function AdminRevenueLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-1 h-4 w-56" />
      </div>

      {/* Stats cards */}
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
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-1 h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    </div>
  );
}
