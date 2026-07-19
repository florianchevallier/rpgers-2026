import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth";
import { addFavorite, listFavorites, removeFavorite } from "@/server/favorites";

const addSchema = z.object({
  userId: z.number().int().positive(),
  pseudo: z.string().min(1).max(50),
});

const removeSchema = z.object({
  userId: z.number().int().positive(),
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const favorites = await listFavorites(session.user.id);
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = addSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  // ⚠️ pas de moisson vers l'annuaire partagé ici : {userId, pseudo} vient du
  // client (empoisonnement possible). Le pseudo favori reste privé à ce compte ;
  // l'annuaire n'est alimenté que par des sources officielles (RSC, recherche).
  await addFavorite(session.user.id, body.data.userId, body.data.pseudo);
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = removeSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  await removeFavorite(session.user.id, body.data.userId);
  return NextResponse.json({ success: true });
}
