import { Skeleton } from "@/components/ui/skeleton";

/** La structure reste en place pendant le chargement : aucune page blanche. */
export default function Loading() {
  return (
    <article className="mx-auto max-w-5xl pb-24 sm:pb-0" aria-busy>
      <span className="sr-only">Chargement de la partie…</span>
      <Skeleton className="mb-4 hidden h-10 w-40 sm:block" />

      <header className="-mx-4 -mt-4 border-b border-border/70 bg-card px-4 pb-6 pt-5 sm:mx-0 sm:mt-0 sm:rounded-2xl sm:border sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="mt-4 h-9 w-4/5" />
            <Skeleton className="mt-3 h-5 w-36" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-11/12" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
          </div>
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </article>
  );
}
