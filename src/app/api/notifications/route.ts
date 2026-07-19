import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import {
  getNotificationCount,
  getNotifications,
  markNotificationsRead,
} from "@/server/rpgers-client";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const [notifications, count] = await Promise.all([
    getNotifications(session.jwt),
    getNotificationCount(session.jwt),
  ]);
  return NextResponse.json({ notifications, ...count });
}

export async function POST() {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  await markNotificationsRead(session.jwt);
  return NextResponse.json({ success: true });
}
