import { Skeleton } from "@/components/ui/skeleton";

export default function HelpLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-8 h-4 w-72" />

      {/* Help category cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="mb-2 h-4 w-full" />
            <div className="space-y-1.5">
              {Array.from({ length: 3 }, (_, j) => (
                <Skeleton key={j} className="h-3 w-3/4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
