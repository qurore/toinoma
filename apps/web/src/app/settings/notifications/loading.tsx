import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-1 h-4 w-72" />
      </div>

      {/* Toggle list card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="space-y-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-10 w-28 rounded-md" />
      </div>
    </div>
  );
}
