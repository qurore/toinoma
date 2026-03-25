import { Skeleton } from "@/components/ui/skeleton";

export default function PayoutsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-4 h-4 w-48" />
      <Skeleton className="mb-1 h-8 w-28" />
      <Skeleton className="mb-8 h-4 w-56" />

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
        ))}
      </div>

      {/* Payouts table */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center gap-4 border-b border-border px-4 py-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
