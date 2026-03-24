import { Skeleton } from "@/components/ui/skeleton";

export default function PrintLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Print toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Problem set header */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <Skeleton className="mx-auto mb-2 h-6 w-64" />
        <Skeleton className="mx-auto h-4 w-40" />
      </div>

      {/* Section placeholders */}
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="mb-8 rounded-lg border border-border bg-card p-6"
        >
          <Skeleton className="mb-4 h-5 w-36" />
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, j) => (
              <div key={j}>
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-1 h-4 w-5/6" />
                <Skeleton className="mt-1 h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
