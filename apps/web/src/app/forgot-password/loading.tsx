import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        {/* Header: icon + title + description */}
        <div className="text-center space-y-2">
          <Skeleton className="mx-auto mb-4 h-14 w-14 rounded-xl" />
          <Skeleton className="mx-auto h-7 w-52" />
          <Skeleton className="mx-auto h-4 w-72" />
          <Skeleton className="mx-auto h-4 w-56" />
        </div>

        {/* Form: email field + submit button */}
        <div className="mt-6 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Back to login link */}
        <div className="mt-3">
          <Skeleton className="mx-auto h-10 w-full rounded-md" />
        </div>
      </div>
    </main>
  );
}
