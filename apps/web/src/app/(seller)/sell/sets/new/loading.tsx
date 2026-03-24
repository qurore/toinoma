import { Skeleton } from "@/components/ui/skeleton";

export default function NewSetLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-56" />
      <Skeleton className="mb-1 h-8 w-44" />
      <Skeleton className="mb-8 h-4 w-64" />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: form */}
        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-28 w-full rounded-md" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="mb-4 h-5 w-28" />
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          </div>
        </div>

        {/* Right: preview */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="mb-4 h-5 w-24" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
