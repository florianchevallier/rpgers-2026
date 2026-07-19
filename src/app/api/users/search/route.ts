import { after, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth";
import { searchUsers } from "@/server/rpgers-client";
import { harvestUsers } from "@/server/user-directory";

const querySchema = z.object({
  q: z.string().min(1).max(50),
  tableId: z.coerce.number().int().positive().optional(),
});

/** Autocomplete pseudo (proxy BFF). */
export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    tableId: url.searchParams.get("tableId") ?? undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const users = await searchUsers(session.jwt, parsed.data.q, {
    tableId: parsed.data.tableId,
  });
  // moisson opportuniste de l'annuaire id→pseudo (« joueurs présents »)
  after(() => harvestUsers(users));
  return NextResponse.json({ users });
}
