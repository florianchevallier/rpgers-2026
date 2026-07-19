"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  tableId: number;
  isRegistered: boolean;
  isFull: boolean;
  unregisterLocked: boolean;
  hasConflict: boolean;
};

/** Bouton S'inscrire / Se désinscrire — appelle le BFF puis rafraîchit. */
export function RegisterButton({
  tableId,
  isRegistered,
  isFull,
  unregisterLocked,
  hasConflict,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "register" | "unregister") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tables/${tableId}/register`, {
        method: action === "register" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau — réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {isRegistered ? (
        <Button
          variant="destructive"
          size="lg"
          className="w-full sm:w-auto"
          disabled={loading || unregisterLocked}
          onClick={() => act("unregister")}
        >
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          Se désinscrire
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={loading || isFull}
          onClick={() => act("register")}
        >
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {isFull
            ? "Tablée complète"
            : hasConflict
              ? "S'inscrire quand même"
              : "S'inscrire"}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
