import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { cached } from "@/server/cache";
import { getTables } from "@/server/rpgers-client";

/**
 * Liste des tablées (proxy BFF).
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
