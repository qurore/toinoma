import { Skeleton } from "@/components/ui/skeleton";

export default function SolveLoading() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-56" />

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Answer area */}
        <div className="space-y-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5">
              <Skeleton className="mb-3 h-5 w-24" />
              <Skeleton className="h-32 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-md" />
        </div>

        {/* Sidebar — problem info */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="mb-3 h-5 w-32" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-4 h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}
