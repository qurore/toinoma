import { Skeleton } from "@/components/ui/skeleton";

export default function FavoritesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-48" />
      {/* Heading + description */}
      <div className="mb-6">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-32" />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-8 w-[140px] rounded-md" />
        <Skeleton className="h-8 w-[140px] rounded-md" />
      </div>

      {/* Favorites grid */}
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
  );
}
