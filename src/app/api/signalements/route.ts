import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth";
import { createSignalement, getSignalements } from "@/server/rpgers-client";

const bodySchema = z.object({
  type: z.string().min(1).max(50),
  message: z.string().min(5).max(2000),
  salleId: z.number().int().positive().optional(),
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const signalements = await getSignalements(session.jwt);
  return NextResponse.json({ signalements });
}

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  await createSignalement(session.jwt, body.data);
  return NextResponse.json({ success: true }, { status: 201 });
}
