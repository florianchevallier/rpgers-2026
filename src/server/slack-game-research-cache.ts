import { z } from "zod";
import { db } from "@/server/db";

const sourcesSchema = z.array(z.url());

export type CachedGameResearch = {
  summary: string;
  sources: string[];
};

export async function readGameResearchCache(
  key: string,
  maxAgeDays: number,
): Promise<CachedGameResearch | null> {
  const cached = await db.slackGameResearch.findUnique({ where: { key } });
  if (!cached) return null;
  if (
    cached.researchedAt.getTime() <
    Date.now() - maxAgeDays * 24 * 60 * 60_000
  ) {
    return null;
  }
  const sources = sourcesSchema.safeParse(JSON.parse(cached.sources));
  if (!sources.success) return null;
  return { summary: cached.summary, sources: sources.data };
}

export async function writeGameResearchCache(
  key: string,
  systemName: string,
  research: CachedGameResearch,
): Promise<void> {
  await db.slackGameResearch.upsert({
    where: { key },
    create: {
      key,
      systemName,
      summary: research.summary,
      sources: JSON.stringify(research.sources),
    },
    update: {
      systemName,
      summary: research.summary,
      sources: JSON.stringify(research.sources),
      researchedAt: new Date(),
    },
  });
}
