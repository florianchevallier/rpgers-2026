import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth";
import { getUrgentPlaces, respondUrgentPlace } from "@/server/rpgers-client";

/** Places urgentes (désistements de dernière minute). */
export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const urgent = await getUrgentPlaces(session.jwt);
  return NextResponse.json({ urgent });
}

/** Répondre à une place urgente : { id, reponse: "yes" | "no" } */
export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = z
    .object({ id: z.number().int().positive(), reponse: z.enum(["yes", "no"]) })
    .safeParse(await request.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  await respondUrgentPlace(session.jwt, body.data.id, body.data.reponse);
  return NextResponse.json({ success: true });
}
