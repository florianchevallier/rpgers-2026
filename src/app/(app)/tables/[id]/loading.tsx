import { Skeleton } from "@/components/ui/skeleton";

/** Squelette de la fiche partie — streaming pendant l'appel à l'API officielle. */
export default function Loading() {
  return (
    <article className="mx-auto max-w-3xl" aria-busy>
      <Skeleton className="h-4 w-36" />
      <div className="mt-4">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-3 h-8 w-3/4" />
        <Skeleton className="mt-2 h-5 w-40" />
      </div>
      <div className="mt-5 flex gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-48 w-full rounded-xl" />
      <Skeleton className="mt-6 h-4 w-72" />
      <Skeleton className="mt-8 h-11 w-full rounded-lg" />
    </article>
  );
}
