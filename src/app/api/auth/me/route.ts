import { NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth";

/** Renvoie l'utilisateur courant (jamais le JWT — il reste côté serveur). */
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: session.user });
}
