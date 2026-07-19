"use client";

import { CloudOff, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sendServiceWorkerMessage, useOnlineStatus } from "@/lib/connectivity";

const CORE_OFFLINE_ROUTES = ["/", "/planning"];

export function OfflineRuntime() {
  const online = useOnlineStatus();
  const previousOnline = useRef(online);
  const [connectionRestored, setConnectionRestored] = useState(false);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    )
      return;

    let cancelled = false;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (registration) => {
        if (cancelled) return;
        await registration.update().catch(() => undefined);
        await sendServiceWorkerMessage({
          type: "WARM_ROUTES",
          urls: CORE_OFFLINE_ROUTES,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!previousOnline.current && online) {
      setConnectionRestored(true);
      const timeout = window.setTimeout(
        () => setConnectionRestored(false),
        3000,
      );
      previousOnline.current = online;
      return () => window.clearTimeout(timeout);
    }
    previousOnline.current = online;
  }, [online]);

  // Next utilise des requêtes RSC pour les transitions. Hors ligne, une
  // navigation document complète permet au service worker de servir la page
  // HTML enregistrée, même si le payload RSC précis n'a pas été préchargé.
  useEffect(() => {
    if (online) return;

    const navigateFromCache = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;

      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname.startsWith("/api/")
      )
        return;

      event.preventDefault();
      window.location.assign(url.href);
    };

    document.addEventListener("click", navigateFromCache, true);
    return () => document.removeEventListener("click", navigateFromCache, true);
  }, [online]);

  if (online && !connectionRestored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-[calc(4rem+env(safe-area-inset-top))] z-50 -translate-x-1/2"
    >
      <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-background/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-xl">
        {online ? (
          <Wifi className="size-3.5 text-success" aria-hidden />
        ) : (
          <CloudOff className="size-3.5 text-orange-500" aria-hidden />
        )}
        {online ? "Connexion rétablie" : "Hors ligne · consultation disponible"}
      </div>
    </div>
  );
}
