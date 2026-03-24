import { Skeleton } from "@/components/ui/skeleton";

export default function SellerSettingsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-1 h-4 w-56" />
      </div>

      {/* Seller info card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Stripe status card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-3 h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-9 w-36 rounded-md" />
      </div>
    </div>
  );
}
