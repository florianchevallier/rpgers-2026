"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/lib/connectivity";

const TYPES = [
  { value: "comportement", label: "Comportement d'un joueur / MJ" },
  { value: "salle", label: "Problème de salle / matériel" },
  { value: "table", label: "Problème sur une partie" },
  { value: "autre", label: "Autre" },
];

export default function SignalementPage() {
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online) {
      setError("Connexion requise pour transmettre le signalement.");
      return;
    }
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/signalements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.get("type"),
          message: form.get("message"),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Erreur inconnue");
        return;
      }
      setDone(true);
    } catch {
      setError("Erreur réseau — réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight">
        Signaler un problème
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Transmis directement à l&apos;orga. En cas d&apos;urgence, va aussi les
        voir à l&apos;accueil.
      </p>

      {done ? (
        <div className="mt-8 rounded-xl border border-success/40 bg-success/10 p-5 text-center">
          <p className="font-semibold text-success">Signalement envoyé ✅</p>
          <p className="mt-1 text-sm text-muted-foreground">
            L&apos;orga le traitera au plus vite. Merci !
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="type">Type de problème</Label>
            <select
              id="type"
              name="type"
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="message">Description *</Label>
            <Textarea
              id="message"
              name="message"
              required
              minLength={5}
              rows={5}
              placeholder="Décris ce qui s'est passé, où, et vers quelle heure…"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading || !online}>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            Envoyer le signalement
          </Button>
          {!online && (
            <p className="text-xs text-muted-foreground">
              En cas d’urgence, adresse-toi directement à l’accueil.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
