"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendServiceWorkerMessage, useOnlineStatus } from "@/lib/connectivity";

export function LogoutButton() {
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (!online) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) return;
      await sendServiceWorkerMessage({ type: "CLEAR_PRIVATE_CACHES" });
      window.location.assign("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={logout}
      disabled={loading || !online}
      title={online ? undefined : "Connexion requise pour se déconnecter"}
    >
      <LogOut aria-hidden />
      {loading ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  );
}
