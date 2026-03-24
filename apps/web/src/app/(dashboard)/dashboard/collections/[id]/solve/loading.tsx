import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionSolveLoading() {
  return (
    <div className="p-4 md:p-6">
      <Skeleton className="mb-4 h-4 w-72" />

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Solve area */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-5">
          <Skeleton className="mb-3 h-5 w-24" />
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <Skeleton className="mb-3 h-5 w-32" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
