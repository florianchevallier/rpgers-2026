import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { planSlackSync } from "@/domain/slack-notifications";
import { db } from "@/server/db";
import { getTables, loginOfficial } from "@/server/rpgers-client";
import { getSlackConfig } from "@/server/slack-config";
import { postTableToSlack } from "@/server/slack-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SYNC_STATE_ID = 1;
const LOCK_LEASE_MS = 30 * 60_000;

function secretMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function isAuthorized(request: Request): boolean {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  return secretMatches(
    bearer ?? request.headers.get("x-cron-secret"),
    process.env.SLACK_CRON_SECRET,
  );
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let config: ReturnType<typeof getSlackConfig>;
  try {
    config = getSlackConfig();
  } catch (error) {
    console.error("[slack] Configuration invalide", error);
    return NextResponse.json(
      { error: "Configuration Slack incomplète" },
      { status: 503 },
    );
  }

  await db.slackSyncState.upsert({
    where: { id: SYNC_STATE_ID },
    create: { id: SYNC_STATE_ID },
    update: {},
  });

  const lockExpiredBefore = new Date(Date.now() - LOCK_LEASE_MS);
  const lock = await db.slackSyncState.updateMany({
    where: {
      id: SYNC_STATE_ID,
      OR: [{ runningSince: null }, { runningSince: { lt: lockExpiredBefore } }],
    },
    data: { runningSince: new Date() },
  });
  if (lock.count === 0) {
    return NextResponse.json({ status: "already_running" }, { status: 202 });
  }

  try {
    const { jwt } = await loginOfficial(
      config.RPGERS_BOT_PSEUDO,
      config.RPGERS_BOT_PASSWORD,
    );
    const tables = await getTables(jwt);
    const [state, announcements] = await Promise.all([
      db.slackSyncState.findUniqueOrThrow({ where: { id: SYNC_STATE_ID } }),
      db.slackAnnouncement.findMany({ select: { tableId: true } }),
    ]);
    const plan = planSlackSync(
      tables,
      new Set(announcements.map(({ tableId }) => tableId)),
      state.initializedAt !== null,
    );

    if (plan.baseline.length > 0 || state.initializedAt === null) {
      await db.$transaction(async (tx) => {
        if (plan.baseline.length > 0) {
          await tx.slackAnnouncement.createMany({
            data: plan.baseline.map(({ id }) => ({ tableId: id })),
          });
        }
        await tx.slackSyncState.update({
          where: { id: SYNC_STATE_ID },
          data: { initializedAt: new Date() },
        });
      });
      return NextResponse.json({
        status: "initialized",
        tables: tables.length,
      });
    }

    const sent: number[] = [];
    for (const table of plan.notifications) {
      const messageTs = await postTableToSlack(table, config);
      await db.slackAnnouncement.create({
        data: { tableId: table.id, messageTs },
      });
      sent.push(table.id);
    }

    return NextResponse.json({ status: "ok", sent });
  } catch (error) {
    console.error("[slack] Échec de la synchronisation", error);
    return NextResponse.json(
      { error: "Échec de la synchronisation Slack" },
      { status: 502 },
    );
  } finally {
    await db.slackSyncState
      .update({
        where: { id: SYNC_STATE_ID },
        data: { runningSince: null },
      })
      .catch((error) =>
        console.error("[slack] Impossible de libérer le verrou", error),
      );
  }
}

/** GET reste accepté pour être compatible avec le cron historique. */
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
