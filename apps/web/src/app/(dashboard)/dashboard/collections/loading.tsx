import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-48" />
      {/* Heading + action button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Collections grid — matching the actual page grid layout */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-5"
          >
            <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-3 w-full" />
            <div className="mt-3 flex items-center gap-3">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
