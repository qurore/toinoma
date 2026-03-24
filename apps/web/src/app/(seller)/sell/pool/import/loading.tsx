import { Skeleton } from "@/components/ui/skeleton";

export default function ImportLoading() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-56" />
      <Skeleton className="mb-1 h-8 w-36" />
      <Skeleton className="mb-8 h-4 w-64" />

      {/* Upload area */}
      <div className="mb-8 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12">
        <Skeleton className="mb-3 h-12 w-12 rounded-full" />
        <Skeleton className="mb-1 h-5 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
