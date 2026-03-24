import { Skeleton } from "@/components/ui/skeleton";

export default function SellerGuideLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-8 h-4 w-72" />

      {/* Guide sections */}
      <div className="space-y-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6"
          >
            <Skeleton className="mb-3 h-6 w-40" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
