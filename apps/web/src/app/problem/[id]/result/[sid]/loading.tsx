import { Skeleton } from "@/components/ui/skeleton";

export default function ResultLoading() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-64" />

      {/* Score summary card */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6 text-center">
        <Skeleton className="mx-auto mb-2 h-6 w-32" />
        <Skeleton className="mx-auto mb-4 h-12 w-24" />
        <div className="flex justify-center gap-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>

      {/* Section-by-section results */}
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </main>
  );
}
