import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth";
import {
  ApiError,
  registerToTable,
  unregisterFromTable,
} from "@/server/rpgers-client";

type Ctx = { params: Promise<{ id: string }> };

const idSchema = z.coerce.number().int().positive();

/** S'inscrire (self) ou inscrire un ami ({pseudo}). */
export async function POST(request: Request, ctx: Ctx) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const tableId = idSchema.safeParse((await ctx.params).id);
  if (!tableId.success)
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const body = z
    .object({ pseudo: z.string().min(1).max(50).optional() })
    .safeParse(await request.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  try {
    await registerToTable(session.jwt, tableId.data, body.data.pseudo);
    return NextResponse.json({ success: true });
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

/** Se désinscrire (self) ou désinscrire un ami ({userId}). */
export async function DELETE(request: Request, ctx: Ctx) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const tableId = idSchema.safeParse((await ctx.params).id);
  if (!tableId.success)
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const body = z
    .object({ userId: z.number().int().positive().optional() })
    .safeParse(await request.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  try {
    await unregisterFromTable(session.jwt, tableId.data, body.data.userId);
    return NextResponse.json({ success: true });
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
