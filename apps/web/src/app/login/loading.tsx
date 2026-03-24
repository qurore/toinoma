import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / heading */}
        <div className="text-center">
          <Skeleton className="mx-auto mb-4 h-10 w-10 rounded-lg" />
          <Skeleton className="mx-auto h-7 w-40" />
          <Skeleton className="mx-auto mt-2 h-4 w-56" />
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>

        {/* Footer link */}
        <Skeleton className="mx-auto h-4 w-48" />
      </div>
    </div>
  );
}
