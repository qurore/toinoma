import { Skeleton } from "@/components/ui/skeleton";

export default function ProblemDetailLoading() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 pt-16">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-48" />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-6 h-64 w-full rounded-lg" />
        </div>

        {/* Sidebar / purchase card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="mb-4 h-7 w-24" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-6 h-4 w-3/4" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
    </main>
  );
}
