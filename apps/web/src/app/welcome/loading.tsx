import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Brand header: logo + title + subtitle */}
        <div className="mb-8 flex flex-col items-center space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Wizard card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="h-2 w-8 rounded-full" />
            <Skeleton className="h-2 w-8 rounded-full" />
            <Skeleton className="h-2 w-8 rounded-full" />
          </div>

          {/* Avatar + display name */}
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>

          {/* Subject chips placeholder */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-14 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-14 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-18 rounded-full" />
            </div>
          </div>

          {/* Action button */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </main>
  );
}
