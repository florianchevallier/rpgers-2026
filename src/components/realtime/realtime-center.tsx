"use client";

import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type UrgentPlace = {
  id: number;
  tableId?: number;
  table?: { titre?: string };
  message?: string;
};

/** Évènement CustomEvent partagé avec la cloche de notifications. */
export const NOTIF_EVENT = "critiquest:notifications";

/**
 * Centre temps réel : ouvre le flux SSE, affiche la bannière « place urgente »
 * et relaie le compteur de notifications à la navbar.
 */
export function RealtimeCenter() {
  const router = useRouter();
  const [urgent, setUrgent] = useState<UrgentPlace[]>([]);
  const [answered, setAnswered] = useState<Set<number>>(new Set());

  useEffect(() => {
    const source = new EventSource("/api/events");

    source.addEventListener("urgent", (event) => {
      try {
        setUrgent(JSON.parse((event as MessageEvent).data) as UrgentPlace[]);
      } catch {
        // payload inattendu → on ignore ce tick
      }
    });

    source.addEventListener("notifications", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          unread: number;
        };
        window.dispatchEvent(new CustomEvent(NOTIF_EVENT, { detail: data }));
      } catch {
        // idem
      }
    });

    return () => source.close();
  }, []);

  async function respond(place: UrgentPlace, reponse: "yes" | "no") {
    setAnswered((prev) => new Set(prev).add(place.id));
    await fetch("/api/urgent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: place.id, reponse }),
    }).catch(() => undefined);
    if (reponse === "yes" && place.tableId) {
      router.push(`/tables/${place.tableId}`);
    }
    router.refresh();
  }

  const pending = urgent.filter((u) => !answered.has(u.id));
  if (pending.length === 0) return null;

  return (
    <div
      role="alert"
      className="sticky top-14 z-30 border-b border-primary/40 bg-primary/15 backdrop-blur"
    >
      {pending.map((place) => (
        <div
          key={place.id}
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2.5"
        >
          <Zap className="size-4 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">
            <strong>Place libérée !</strong>{" "}
            {place.table?.titre
              ? `« ${place.table.titre} » a une place qui vient de se libérer.`
              : (place.message ??
                "Une tablée a une place qui vient de se libérer.")}
          </p>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => respond(place, "yes")}>
              Je la prends !
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => respond(place, "no")}
            >
              Passer
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
