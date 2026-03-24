import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        {/* Header: icon + title + description */}
        <div className="text-center space-y-2">
          <Skeleton className="mx-auto mb-4 h-14 w-14 rounded-xl" />
          <Skeleton className="mx-auto h-7 w-56" />
          <Skeleton className="mx-auto h-4 w-52" />
        </div>

        {/* Form: password + confirm password + submit */}
        <div className="mt-6 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </main>
  );
}
