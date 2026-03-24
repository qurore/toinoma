import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-12 text-center">
        <Skeleton className="mx-auto mb-1 h-8 w-32" />
        <Skeleton className="mx-auto mb-8 h-4 w-64" />

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              {i < 2 && <Skeleton className="h-0.5 w-12" />}
            </div>
          ))}
        </div>

        <Skeleton className="mx-auto mt-6 h-3 w-56" />
      </div>

      {/* Step content card */}
      <div className="rounded-lg border border-border bg-card p-8">
        <Skeleton className="mb-4 h-6 w-40" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-5/6" />
        <Skeleton className="mb-6 h-4 w-2/3" />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
