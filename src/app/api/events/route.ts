import { requireSession } from "@/server/auth";
import { getNotificationCount, getUrgentPlaces } from "@/server/rpgers-client";

export const dynamic = "force-dynamic";

/**
 * SSE temps réel (remplace le polling 2 min de l'officiel).
 * Chaque connexion poll l'API officielle toutes les 15 s avec le JWT serveur
 * de l'utilisateur et pousse UNIQUEMENT les changements (notifications, places
 * urgentes). Usage « amis » → pas besoin de poller partagé multi-tenant.
 */
const POLL_MS = 15_000;
const HEARTBEAT_MS = 30_000;

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return new Response("Non authentifié", { status: 401 });
  }
  const { jwt } = session;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          // connexion fermée entre-temps
        }
      };

      let lastUnread: number | null = null;
      let lastUrgentKey = "";

      const tick = async () => {
        try {
          const [count, urgent] = await Promise.all([
            getNotificationCount(jwt),
            getUrgentPlaces(jwt),
          ]);
          if (count.unread !== lastUnread) {
            lastUnread = count.unread;
            send("notifications", count);
          }
          const urgentKey = urgent.map((u) => u.id).join(",");
          if (urgentKey !== lastUrgentKey) {
            lastUrgentKey = urgentKey;
            send("urgent", urgent);
          }
        } catch {
          // API officielle momentanément injoignable → on retente au prochain tick
        }
      };

      await tick();
      const poll = setInterval(tick, POLL_MS);
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // fermé
        }
      }, HEARTBEAT_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(poll);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // déjà fermé
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // désactive le buffering nginx
    },
  });
}
