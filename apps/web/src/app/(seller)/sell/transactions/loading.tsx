import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-4 h-4 w-48" />
      <Skeleton className="mb-1 h-8 w-36" />
      <Skeleton className="mb-8 h-4 w-56" />

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center gap-4 border-b border-border px-4 py-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
