import { Skeleton } from "@/components/ui/skeleton";

export default function FaqLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-8 h-4 w-64" />

      {/* Search bar */}
      <Skeleton className="mb-8 h-10 w-full max-w-md rounded-md" />

      {/* FAQ categories */}
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4"
          >
            <Skeleton className="h-5 w-64" />
          </div>
        ))}
      </div>
    </div>
  );
}
