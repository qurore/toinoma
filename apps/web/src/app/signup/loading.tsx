import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        {/* Header: icon + title + description */}
        <div className="text-center space-y-2">
          <Skeleton className="mx-auto mb-4 h-14 w-14 rounded-xl" />
          <Skeleton className="mx-auto h-7 w-56" />
          <Skeleton className="mx-auto h-4 w-72" />
        </div>

        {/* Form fields: email, password, confirm password */}
        <div className="mt-6 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          {/* Submit button */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Login link + ToS text */}
        <div className="mt-4 space-y-2">
          <Skeleton className="mx-auto h-4 w-48" />
          <Skeleton className="mx-auto h-3 w-64" />
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-8 flex items-center gap-4">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-20" />
      </div>
    </main>
  );
}
