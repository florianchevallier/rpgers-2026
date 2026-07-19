"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NOTIF_EVENT } from "@/components/realtime/realtime-center";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Cloche de notifications — compteur live via SSE (CustomEvent du RealtimeCenter). */
export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ unread: number }>).detail;
      setUnread(detail.unread);
    };
    window.addEventListener(NOTIF_EVENT, handler);
    return () => window.removeEventListener(NOTIF_EVENT, handler);
  }, []);

  return (
    <Button variant="ghost" size="icon" aria-label="Notifications" asChild>
      <Link href="/notifications" className="relative">
        <Bell className="size-4" />
        {unread > 0 && (
          <Badge
            className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full p-0 text-[10px]"
            aria-label={`${unread} notifications non lues`}
          >
            {unread}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
