import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth";
import {
  deleteFilterPreset,
  listFilterPresets,
  saveFilterPreset,
} from "@/server/filter-presets";

const paramsSchema = z.object({
  day: z.string().nullable(),
  labels: z.array(z.number()),
  excludedLabels: z.array(z.number()),
  mj: z.string().nullable(),
  excludedMj: z.string().nullable(),
  free: z.boolean(),
  mine: z.boolean(),
  past: z.boolean(),
  hideConflicting: z.boolean(),
  favorites: z.boolean(),
});

const saveSchema = z.object({
  name: z.string().min(1).max(40),
  params: paramsSchema,
});

const deleteSchema = z.object({
  id: z.number().int().positive(),
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const presets = await listFilterPresets(session.user.id);
  return NextResponse.json({ presets });
}

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = saveSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  await saveFilterPreset(session.user.id, body.data.name, body.data.params);
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = deleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  await deleteFilterPreset(session.user.id, body.data.id);
  return NextResponse.json({ success: true });
}
