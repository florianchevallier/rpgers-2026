import { Skeleton } from "@/components/ui/skeleton";

/** État de chargement neutre partagé par les écrans authentifiés. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-7" aria-busy>
      <span className="sr-only">Chargement…</span>
      <header>
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-2 h-10 w-52" />
      </header>

      <Skeleton className="h-11 w-full rounded-lg" />

      <div className="grid gap-2.5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: liste statique de squelettes
            key={index}
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="mt-3 h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-36" />
              </div>
              <Skeleton className="h-10 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
