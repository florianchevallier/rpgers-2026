import { BellOff } from "lucide-react";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { requirePageSession } from "@/server/auth";
import { getNotifications } from "@/server/rpgers-client";

export default async function NotificationsPage() {
  const session = await requirePageSession();
  const notifications = await getNotifications(session.jwt);

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        {notifications.some((notification) => !notification.read) && (
          <MarkAllReadButton />
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-12 grid place-items-center text-center">
          <BellOff className="size-10 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-muted-foreground">
            Aucune notification pour l&apos;instant.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-xl border p-4 text-sm ${
                notification.read
                  ? "border-border text-muted-foreground"
                  : "border-primary/30 bg-primary/5 text-foreground"
              }`}
            >
              {notification.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
