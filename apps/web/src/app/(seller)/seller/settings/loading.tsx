import { Skeleton } from "@/components/ui/skeleton";

export default function SellerSettingsLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-48" />
      <Skeleton className="mb-1 h-8 w-28" />
      <Skeleton className="mb-8 h-4 w-56" />

      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-28 w-full rounded-md" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}
