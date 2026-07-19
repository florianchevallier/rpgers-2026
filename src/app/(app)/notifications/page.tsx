"use client";

import { BellOff, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Notification = {
  id: number;
  message: string;
  read: boolean;
  createdAt?: string;
  type?: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => setNotifications(d.notifications ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-wide">
          Notifications
        </h1>
        {notifications.some((n) => !n.read) && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="size-4" aria-hidden />
            Tout marquer lu
          </Button>
        )}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Chargement…</p>
      ) : notifications.length === 0 ? (
        <div className="mt-12 grid place-items-center text-center">
          <BellOff className="size-10 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-muted-foreground">
            Aucune notification pour l&apos;instant.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-3 text-sm ${
                n.read
                  ? "border-border text-muted-foreground"
                  : "border-primary/40 bg-primary/5"
              }`}
            >
              {n.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
