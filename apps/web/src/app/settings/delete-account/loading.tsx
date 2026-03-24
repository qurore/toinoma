import { Skeleton } from "@/components/ui/skeleton";

export default function DeleteAccountLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>

      {/* Warning banner */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
      </div>

      {/* Confirmation card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-4 h-5 w-28" />
        <Skeleton className="mb-3 h-4 w-full" />
        <Skeleton className="mb-3 h-4 w-3/4" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="mt-3 h-10 w-40 rounded-md" />
      </div>
    </div>
  );
}
