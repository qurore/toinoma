import { Skeleton } from "@/components/ui/skeleton";

export default function SellerProfileLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-20 sm:px-6">
      {/* Profile header card */}
      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <Skeleton className="h-24 w-24 shrink-0 rounded-full" />

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-4 w-48" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl" />
            <Skeleton className="mt-1 h-4 w-3/4 max-w-xl" />
          </div>
        </div>

        {/* Separator */}
        <Skeleton className="my-6 h-px w-full" />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-lg bg-muted/50 p-4"
            >
              <Skeleton className="mb-1.5 h-5 w-5 rounded" />
              <Skeleton className="h-7 w-10" />
              <Skeleton className="mt-1 h-3 w-14" />
            </div>
          ))}
        </div>
      </div>

      {/* Published problem sets */}
      <div className="mt-8">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <Skeleton className="h-36 w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
