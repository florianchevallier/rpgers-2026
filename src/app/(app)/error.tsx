"use client";

import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Filet de sécurité du groupe (app) : l'API officielle peut tomber ou changer
 * de forme pendant la convention — on affiche un état actionnable, jamais un
 * écran blanc (règle 🔴 CLAUDE.md §5.2).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid place-items-center py-20 text-center">
      <ScrollText className="size-10 text-muted-foreground" aria-hidden />
      <h2 className="mt-4 font-heading text-xl font-semibold">
        Le grimoire s&apos;est refermé
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Le serveur officiel n&apos;a pas répondu comme prévu. Réessaie — si ça
        persiste, préviens l&apos;orga du clone.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-muted-foreground/60">
          réf. {error.digest}
        </p>
      )}
      <Button onClick={reset} variant="outline" className="mt-5">
        Réessayer
      </Button>
    </div>
  );
}
