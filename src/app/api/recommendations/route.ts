import { NextResponse } from "next/server";
import { recommendationRequestSchema } from "@/domain/recommendation-contract";
import {
  buildRecommendationPlan,
  buildSpecificTableMatches,
} from "@/domain/recommendations";
import { tablesToMarkdown } from "@/domain/tables-markdown";
import { requireSession } from "@/server/auth";
import { rateLimit } from "@/server/ratelimit";
import {
  createRecommendationQuestion,
  maxTablesPerDay,
  preferredDuration,
  rankRecommendedTables,
  toRecommendedTableView,
} from "@/server/recommendations";
import { getTables } from "@/server/rpgers-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const limit = rateLimit(`recommendations:${session.user.id}`, {
    limit: 30,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessaie un peu plus tard." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterS) },
      },
    );
  }

  const body = recommendationRequestSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!body.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  try {
    const tables = await getTables(session.jwt);
    const markdown = tablesToMarkdown(tables, {
      origin: new URL(request.url).origin,
    });

    if (body.data.action === "search") {
      const ranking = await rankRecommendedTables(
        markdown,
        tables,
        [],
        [],
        body.data.query,
        "search",
      );
      const matches = buildSpecificTableMatches(tables, ranking.rankings, {
        currentUserId: session.user.id,
        isAdult: session.user.isAdult,
      });
      return NextResponse.json({
        profileSummary: ranking.profileSummary,
        usedLlm: ranking.usedLlm,
        matches: matches.map(({ table, reason }) =>
          toRecommendedTableView(table, reason),
        ),
      });
    }

    if (body.data.action === "question") {
      if (!answersBelongToQuestions(body.data.questions, body.data.answers)) {
        return NextResponse.json(
          { error: "Réponses invalides" },
          { status: 400 },
        );
      }
      const result = await createRecommendationQuestion(
        markdown,
        tables,
        body.data.questions,
        body.data.answers,
      );
      return NextResponse.json(result);
    }

    if (!answersBelongToQuestions(body.data.questions, body.data.answers)) {
      return NextResponse.json(
        { error: "Réponses invalides" },
        { status: 400 },
      );
    }

    const ranking = await rankRecommendedTables(
      markdown,
      tables,
      body.data.questions,
      body.data.answers,
      body.data.freeText,
    );
    const plan = buildRecommendationPlan(tables, ranking.rankings, {
      currentUserId: session.user.id,
      isAdult: session.user.isAdult,
      maxPerDay: maxTablesPerDay(body.data.answers),
      preferredDuration: preferredDuration(body.data.answers),
    });

    return NextResponse.json({
      profileSummary: ranking.profileSummary,
      usedLlm: ranking.usedLlm,
      slots: plan.slots.map((slot) => ({
        slotId: slot.slotId,
        selected: toRecommendedTableView(slot.selected, slot.reason),
        alternatives: slot.alternatives.map(({ table, reason }) =>
          toRecommendedTableView(table, reason),
        ),
      })),
    });
  } catch (error) {
    console.error(
      "[recommendations] Impossible de construire la sélection",
      error,
    );
    return NextResponse.json(
      { error: "Impossible de préparer les recommandations pour le moment." },
      { status: 503 },
    );
  }
}

function answersBelongToQuestions(
  questions: Array<{ id: string; options: Array<{ id: string }> }>,
  answers: Array<{ questionId: string; optionIds: string[] }>,
): boolean {
  const questionById = new Map(
    questions.map((question) => [question.id, question]),
  );
  return answers.every((answer) => {
    const question = questionById.get(answer.questionId);
    if (!question) return false;
    const validOptions = new Set(question.options.map(({ id }) => id));
    return answer.optionIds.every((id) => validOptions.has(id));
  });
}
