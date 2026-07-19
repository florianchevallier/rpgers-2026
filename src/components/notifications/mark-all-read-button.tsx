"use client";

import { CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/connectivity";

export function MarkAllReadButton() {
  const router = useRouter();
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);

  async function markAllRead() {
    if (!online) return;
    setLoading(true);
    try {
      await fetch("/api/notifications", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={markAllRead}
      disabled={loading || !online}
      title={online ? undefined : "Connexion requise"}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <CheckCheck className="size-4" aria-hidden />
      )}
      <span className="hidden sm:inline">Tout marquer comme lu</span>
      <span className="sm:hidden">Tout lire</span>
    </Button>
  );
}
