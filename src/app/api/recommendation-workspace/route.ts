import { NextResponse } from "next/server";
import { workspaceMutationSchema } from "@/domain/recommendation-workspace";
import { requireSession } from "@/server/auth";
import {
  clearWorkspacePart,
  loadRecommendationWorkspace,
  loadReplacementAlternatives,
  mutateSavedPlan,
} from "@/server/recommendation-workspace";
import { getTables } from "@/server/rpgers-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  try {
    const tables = await getTables(session.jwt);
    return NextResponse.json(
      await loadRecommendationWorkspace(
        session.user.id,
        session.user.isAdult,
        tables,
      ),
    );
  } catch (error) {
    console.error("[recommendation-workspace] chargement impossible", error);
    return NextResponse.json(
      { error: "Impossible de retrouver ta sélection." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const body = workspaceMutationSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!body.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  try {
    if (body.data.action === "clear-plan") {
      await clearWorkspacePart(session.user.id, "plan");
      return NextResponse.json({ success: true });
    }
    if (body.data.action === "clear-search") {
      await clearWorkspacePart(session.user.id, "search");
      return NextResponse.json({ success: true });
    }

    const tables = await getTables(session.jwt);
    if (body.data.action === "alternatives") {
      return NextResponse.json({
        alternatives: await loadReplacementAlternatives({
          userId: session.user.id,
          isAdult: session.user.isAdult,
          tables,
          tableId: body.data.tableId,
        }),
      });
    }
    const result = await mutateSavedPlan({
      userId: session.user.id,
      isAdult: session.user.isAdult,
      tables,
      action:
        body.data.action === "add"
          ? {
              type: "add",
              tableId: body.data.tableId,
              ...(body.data.replaceTableId
                ? { replaceTableId: body.data.replaceTableId }
                : {}),
            }
          : body.data.action === "replace"
            ? {
                type: "replace",
                tableId: body.data.tableId,
                replacementId: body.data.replacementId,
              }
            : { type: "remove", tableId: body.data.tableId },
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, conflicts: result.conflicts },
        { status: 409 },
      );
    }
    return NextResponse.json(result.workspace);
  } catch (error) {
    console.error("[recommendation-workspace] mutation impossible", error);
    return NextResponse.json(
      { error: "Impossible de modifier ta sélection." },
      { status: 503 },
    );
  }
}
