import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pt-16 sm:px-6">
      <Skeleton className="mb-6 h-8 w-24" />

      {/* Filter tabs */}
      <Skeleton className="mb-4 h-10 w-full rounded-md" />

      {/* Notification items */}
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
          >
            <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </main>
  );
}
