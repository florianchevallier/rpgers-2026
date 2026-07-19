"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Retour à la liste des tablées via l'historique du navigateur plutôt qu'un
 * <Link> (qui pousse une nouvelle entrée et remet le scroll en haut) — permet
 * à Next.js de restaurer la position de scroll exacte de la liste.
 */
export function BackToListLink() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Retour aux parties
    </button>
  );
}
