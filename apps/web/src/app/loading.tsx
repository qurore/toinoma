import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xl font-bold tracking-tight text-primary">
            Toinoma
          </span>
        </div>
        <Skeleton className="h-4 w-48" />
      </div>
    </main>
  );
}
