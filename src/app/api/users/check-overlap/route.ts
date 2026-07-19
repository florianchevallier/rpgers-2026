import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth";
import { checkOverlap } from "@/server/rpgers-client";

const bodySchema = z.object({
  userId: z.number().int().positive(),
  startDatetime: z.iso.datetime(),
  endDatetime: z.iso.datetime(),
});

/** Vérifie le conflit d'horaire d'un joueur (proxy BFF). */
export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const result = await checkOverlap(session.jwt, body.data);
  return NextResponse.json(result);
}
