import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-4 w-64" />

      {/* Form card skeleton */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-10 w-28 rounded-md" />
      </div>
    </div>
  );
}
