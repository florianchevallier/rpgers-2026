import { NextResponse } from "next/server";
import { z } from "zod";
import { findLabelConflicts } from "@/domain/labels";
import { findForbiddenWord } from "@/domain/profanity";
import { requireSession } from "@/server/auth";
import { cached } from "@/server/cache";
import { getLabelsCatalog } from "@/server/labels";
import { ApiError, createTable, getTables } from "@/server/rpgers-client";

/**
 * GET — liste des tablées (proxy BFF).
 * Cache très court (30 s) : l'officiel sert ~380 Ko pour 104 tablées et on ne
 * veut pas marteler leur API ; la fraîcheur temps réel vient du SSE (Phase 4).
 */
export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const tables = await cached("tables:all", 30_000, () =>
    getTables(session.jwt),
  );
  return NextResponse.json({ tables });
}

const bodySchema = z.object({
  titre: z.string().min(3).max(100),
  description: z.string().min(10).max(5000),
  systemeJeu: z.string().min(2).max(100),
  startDatetime: z.iso.datetime(),
  endDatetime: z.iso.datetime(),
  maxPlayers: z.number().int().min(1).max(20),
  invitedUserIds: z.array(z.number().int().positive()).max(20).default([]),
  labelIds: z.array(z.number().int().positive()).max(10).default([]),
  // ⚠️ champ sensible — revérifié côté serveur (jamais de confiance client)
  ownerId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Requête invalide" },
      { status: 400 },
    );
  }
  const input = body.data;

  // 🔴 Filtre anti-injures côté serveur (l'officiel ne le fait que côté client)
  for (const [field, value] of [
    ["titre", input.titre],
    ["description", input.description],
    ["systemeJeu", input.systemeJeu],
  ] as const) {
    const word = findForbiddenWord(value);
    if (word) {
      return NextResponse.json(
        { error: `Le champ « ${field} » contient un terme interdit.` },
        { status: 400 },
      );
    }
  }

  // 🔴 Matrice de conflits de labels, revalidée côté serveur
  const catalog = await getLabelsCatalog();
  const conflicts = findLabelConflicts(catalog, input.labelIds);
  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: `Labels incompatibles : ${conflicts
          .map((c) => `« ${c.labelA} » et « ${c.labelB} »`)
          .join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Cohérence horaire
  if (new Date(input.endDatetime) <= new Date(input.startDatetime)) {
    return NextResponse.json(
      { error: "La fin doit être après le début." },
      { status: 400 },
    );
  }

  // 🔴 ownerId : honoré UNIQUEMENT si la session serveur confirme isAdmin
  // (faille IDOR repérée sur l'officiel — analyse §5)
  let ownerId: number | undefined;
  if (input.ownerId !== undefined) {
    if (!session.user.isAdmin) {
      return NextResponse.json(
        {
          error:
            "Seul un admin peut créer une tablée au nom d'un autre joueur.",
        },
        { status: 403 },
      );
    }
    ownerId = input.ownerId;
  }

  try {
    const { id } = await createTable(session.jwt, {
      titre: input.titre,
      description: input.description,
      systemeJeu: input.systemeJeu,
      startDatetime: input.startDatetime,
      endDatetime: input.endDatetime,
      maxPlayers: input.maxPlayers,
      reservedByAdmin: input.invitedUserIds.length,
      adminPlaces: 2,
      invitedUserIds: input.invitedUserIds,
      labelIds: input.labelIds,
      ...(ownerId !== undefined ? { ownerId } : {}),
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 502 },
      );
    }
    throw error;
  }
}
