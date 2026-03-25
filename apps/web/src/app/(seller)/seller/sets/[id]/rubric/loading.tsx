import { Skeleton } from "@/components/ui/skeleton";

export default function RubricEditorLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-64" />
      <Skeleton className="mb-1 h-8 w-40" />
      <Skeleton className="mb-8 h-4 w-56" />

      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 2 }, (_, j) => (
                <div key={j} className="rounded-md border border-border p-4">
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-1 h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
