import { Skeleton } from "@/components/ui/skeleton";

/** Squelette de l'explorateur — streaming pendant l'appel à l'API officielle. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      {/* barre de filtres */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-full sm:w-64" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* titre de jour */}
      <div>
        <Skeleton className="h-6 w-56" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: liste statique de squelettes
              key={i}
              className="rounded-xl border border-border bg-card p-4"
            >
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="mt-2.5 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-32" />
              <div className="mt-3 flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
