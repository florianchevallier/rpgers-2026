import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth";
import { loadRecommendationWorkspace } from "@/server/recommendation-workspace";
import {
  ApiError,
  getTables,
  invalidateTables,
  registerToTable,
} from "@/server/rpgers-client";

const confirmationSchema = z.object({ confirm: z.literal(true) });

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const body = confirmationSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!body.success) {
    return NextResponse.json(
      { error: "Une confirmation explicite est requise." },
      { status: 400 },
    );
  }

  const tables = await getTables(session.jwt);
  const workspace = await loadRecommendationWorkspace(
    session.user.id,
    session.user.isAdult,
    tables,
  );
  if (!workspace.plan || workspace.plan.slots.length === 0) {
    return NextResponse.json(
      { error: "Ton planning est vide." },
      { status: 400 },
    );
  }

  const tableById = new Map(tables.map((table) => [table.id, table]));
  const existingRegistrations = tables.filter((table) =>
    table.registrations.some(
      ({ userId, statut }) =>
        userId === session.user.id && statut === "confirmed",
    ),
  );
  const results: Array<{
    tableId: number;
    status: "registered" | "already-registered" | "failed";
    message?: string;
  }> = [];

  for (const slot of workspace.plan.slots) {
    const table = tableById.get(slot.selected.id);
    if (!table) {
      results.push({
        tableId: slot.selected.id,
        status: "failed",
        message: "Table introuvable.",
      });
      continue;
    }
    const alreadyRegistered =
      table.ownerId === session.user.id ||
      table.registrations.some(
        ({ userId, statut }) =>
          userId === session.user.id && statut === "confirmed",
      );
    if (alreadyRegistered) {
      results.push({ tableId: table.id, status: "already-registered" });
      continue;
    }
    const conflictingRegistration = existingRegistrations.find(
      (registered) =>
        registered.startDatetime < table.endDatetime &&
        table.startDatetime < registered.endDatetime,
    );
    if (conflictingRegistration) {
      results.push({
        tableId: table.id,
        status: "failed",
        message: `Chevauche une inscription existante : ${conflictingRegistration.titre}.`,
      });
      continue;
    }
    if (table.statut !== "open" || table.placesLibresPubliques <= 0) {
      results.push({
        tableId: table.id,
        status: "failed",
        message: "Cette table n’a plus de place disponible.",
      });
      continue;
    }
    try {
      await registerToTable(session.jwt, table.id);
      results.push({ tableId: table.id, status: "registered" });
      existingRegistrations.push(table);
    } catch (error) {
      results.push({
        tableId: table.id,
        status: "failed",
        message:
          error instanceof ApiError ? error.message : "L’inscription a échoué.",
      });
    }
  }

  invalidateTables(session.jwt);
  return NextResponse.json({ results });
}
