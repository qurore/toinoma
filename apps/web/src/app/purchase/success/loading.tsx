import { Skeleton } from "@/components/ui/skeleton";

export default function PurchaseSuccessLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 pb-20 pt-14">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-lg">
          <Skeleton className="h-2 w-full rounded-none" />
          <div className="px-8 pb-8 pt-10 text-center">
            <Skeleton className="mx-auto mb-6 h-24 w-24 rounded-full" />
            <Skeleton className="mx-auto mb-1 h-7 w-48" />
            <Skeleton className="mx-auto mb-6 h-4 w-36" />
            <Skeleton className="mx-auto mb-6 h-20 w-full rounded-lg" />
            <Skeleton className="mb-4 h-12 w-full rounded-md" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-8 space-y-3">
          <Skeleton className="mx-auto h-3 w-24" />
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
