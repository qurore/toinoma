import { Skeleton } from "@/components/ui/skeleton";

export default function NewQuestionLoading() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-56" />
      <Skeleton className="mb-1 h-8 w-40" />
      <Skeleton className="mb-8 h-4 w-64" />

      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
        <div className="flex justify-end gap-3">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </main>
  );
}
