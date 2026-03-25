import { Skeleton } from "@/components/ui/skeleton";

export default function LegalLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-2 h-8 w-32" />
      <Skeleton className="mb-8 h-4 w-64" />

      {/* Legal page link cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
