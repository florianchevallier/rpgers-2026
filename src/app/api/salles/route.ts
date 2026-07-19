import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { cached } from "@/server/cache";
import { getSalles } from "@/server/rpgers-client";

/** Salles — quasi-statiques pendant l'évènement → cache 10 min. */
export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const salles = await cached("salles:all", 600_000, () =>
    getSalles(session.jwt),
  );
  return NextResponse.json({ salles });
}
