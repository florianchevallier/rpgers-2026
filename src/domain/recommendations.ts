import type { RpgersTable } from "@/server/rpgers-schemas";

const EVENT_TIME_ZONE = "Europe/Paris";
const MIN_MEAL_BREAK_MINUTES = 60;
const MEAL_WINDOWS = [
  { start: 11 * 60, end: 15 * 60 },
  { start: 17 * 60, end: 22 * 60 },
] as const;

const localTimePartsFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: EVENT_TIME_ZONE,
});

export type RankedRecommendation = {
  tableId: number;
  score: number;
  reason: string;
};

export type RecommendationPolicy = {
  currentUserId: number;
  isAdult: boolean;
  maxPerDay: number;
  preferredDuration?: "short" | "medium" | "long";
};

export type RecommendationSlot = {
  slotId: number;
  selected: RpgersTable;
  reason: string;
  alternatives: Array<{ table: RpgersTable; reason: string }>;
};

export type RecommendationPlan = {
  slots: RecommendationSlot[];
};

export type SpecificTableMatch = {
  table: RpgersTable;
  reason: string;
};

type Candidate = {
  table: RpgersTable;
  score: number;
  reason: string;
};

/** Retourne les meilleures tables disponibles, sans tenter de créer un planning. */
export function buildSpecificTableMatches(
  tables: RpgersTable[],
  rankings: RankedRecommendation[],
  policy: Pick<RecommendationPolicy, "currentUserId" | "isAdult">,
  limit = 12,
): SpecificTableMatch[] {
  const rankingById = new Map(
    rankings.map((ranking) => [ranking.tableId, ranking]),
  );
  return tables
    .filter((table) =>
      isEligible(table, { ...policy, maxPerDay: Number.MAX_SAFE_INTEGER }),
    )
    .map((table) => ({
      table,
      score: rankingById.get(table.id)?.score ?? 0,
      reason:
        rankingById.get(table.id)?.reason ??
        "Cette partie peut correspondre à ta recherche.",
    }))
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        left.table.startDatetime.getTime() -
          right.table.startDatetime.getTime(),
    )
    .slice(0, limit)
    .map(({ table, reason }) => ({ table, reason }));
}

/** Construit un planning valide à partir du classement sémantique du LLM. */
export function buildRecommendationPlan(
  tables: RpgersTable[],
  rankings: RankedRecommendation[],
  policy: RecommendationPolicy,
): RecommendationPlan {
  const rankingById = new Map(
    rankings.map((ranking) => [ranking.tableId, ranking]),
  );
  const candidates = tables
    .filter((table) => isEligible(table, policy))
    .map((table) => {
      const ranking = rankingById.get(table.id);
      return {
        table,
        score: ranking?.score ?? 1,
        reason:
          ranking?.reason ?? "Cette partie reste compatible avec ton planning.",
      };
    });
  const byDay = Map.groupBy(candidates, ({ table }) =>
    eventDayKey(table.startDatetime),
  );
  const candidatePoolByDay = new Map(
    [...byDay].map(([day, dayCandidates]) => [
      day,
      preferredDurationCandidates(dayCandidates, policy.preferredDuration),
    ]),
  );
  const selected = [...candidatePoolByDay.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .flatMap(([, dayCandidates]) =>
      bestNonOverlapping(dayCandidates, policy.maxPerDay),
    )
    .toSorted(
      (left, right) =>
        left.table.startDatetime.getTime() -
        right.table.startDatetime.getTime(),
    );
  const selectedIds = new Set(selected.map(({ table }) => table.id));

  return {
    slots: selected.map((candidate) => {
      const otherSelections = selected.filter(
        ({ table }) => table.id !== candidate.table.id,
      );
      const alternatives = (
        candidatePoolByDay.get(eventDayKey(candidate.table.startDatetime)) ?? []
      )
        .filter(
          ({ table }) =>
            !selectedIds.has(table.id) &&
            otherSelections.every(
              ({ table: other }) => !overlap(table, other),
            ) &&
            hasMealBreaks([
              ...otherSelections.filter(
                ({ table: other }) =>
                  eventDayKey(other.startDatetime) ===
                  eventDayKey(table.startDatetime),
              ),
              { ...candidate, table },
            ]),
        )
        .toSorted(
          (left, right) =>
            similarityScore(right, candidate) -
            similarityScore(left, candidate),
        )
        .slice(0, 3)
        .map(({ table, reason }) => ({ table, reason }));

      return {
        slotId: candidate.table.id,
        selected: candidate.table,
        reason: candidate.reason,
        alternatives,
      };
    }),
  };
}

function preferredDurationCandidates(
  candidates: Candidate[],
  preference: RecommendationPolicy["preferredDuration"],
): Candidate[] {
  if (!preference) return candidates;
  const matching = candidates.filter(({ table }) =>
    matchesDuration(table, preference),
  );
  return matching.length > 0 ? matching : candidates;
}

function matchesDuration(
  table: RpgersTable,
  preference: NonNullable<RecommendationPolicy["preferredDuration"]>,
): boolean {
  const durationHours =
    (table.endDatetime.getTime() - table.startDatetime.getTime()) / 3_600_000;
  if (preference === "short") return durationHours <= 2;
  if (preference === "medium") return durationHours > 2 && durationHours <= 4;
  return durationHours > 4;
}

function isEligible(
  table: RpgersTable,
  { currentUserId, isAdult }: RecommendationPolicy,
): boolean {
  const isMine =
    table.ownerId === currentUserId ||
    table.registrations.some(
      ({ userId, statut }) =>
        userId === currentUserId && statut === "confirmed",
    );
  const isAdultOnly = table.labels.some(({ label }) => label.isAdult);
  return (
    table.statut === "open" &&
    (table.placesLibresPubliques > 0 || isMine) &&
    (isAdult || !isAdultOnly)
  );
}

function eventDayKey(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: EVENT_TIME_ZONE });
}

function bestNonOverlapping(
  candidates: Candidate[],
  limit: number,
): Candidate[] {
  const sorted = candidates.toSorted(
    (left, right) =>
      left.table.startDatetime.getTime() - right.table.startDatetime.getTime(),
  );
  let best: Candidate[] = [];

  function visit(startIndex: number, selected: Candidate[]): void {
    if (
      hasMealBreaks(selected) &&
      (totalScore(selected) > totalScore(best) ||
        (totalScore(selected) === totalScore(best) &&
          selected.length > best.length))
    ) {
      best = [...selected];
    }
    if (selected.length >= Math.max(1, limit)) return;

    for (let index = startIndex; index < sorted.length; index++) {
      const candidate = sorted[index];
      if (selected.some(({ table }) => overlap(table, candidate.table))) {
        continue;
      }
      visit(index + 1, [...selected, candidate]);
    }
  }

  visit(0, []);
  return best;
}

function totalScore(candidates: Candidate[]): number {
  return candidates.reduce((total, candidate) => total + candidate.score, 0);
}

function hasMealBreaks(candidates: Candidate[]): boolean {
  if (candidates.length === 0) return true;
  const day = eventDayKey(candidates[0].table.startDatetime);
  return MEAL_WINDOWS.every((window) => {
    const busy = candidates
      .map(({ table }) => ({
        start:
          eventDayKey(table.startDatetime) === day
            ? localMinuteOfDay(table.startDatetime)
            : 0,
        end:
          eventDayKey(table.endDatetime) === day
            ? localMinuteOfDay(table.endDatetime)
            : 24 * 60,
      }))
      .map(({ start, end }) => ({
        start: Math.max(start, window.start),
        end: Math.min(end, window.end),
      }))
      .filter(({ start, end }) => start < end)
      .toSorted((left, right) => left.start - right.start);

    let cursor = window.start;
    for (const interval of busy) {
      if (interval.start - cursor >= MIN_MEAL_BREAK_MINUTES) return true;
      cursor = Math.max(cursor, interval.end);
    }
    return window.end - cursor >= MIN_MEAL_BREAK_MINUTES;
  });
}

function localMinuteOfDay(date: Date): number {
  const parts = localTimePartsFormatter.formatToParts(date);
  const hour = Number(parts.find(({ type }) => type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find(({ type }) => type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}

function overlap(left: RpgersTable, right: RpgersTable): boolean {
  return (
    left.startDatetime < right.endDatetime &&
    right.startDatetime < left.endDatetime
  );
}

function similarityScore(candidate: Candidate, reference: Candidate): number {
  const candidateLabels = new Set(
    candidate.table.labels.map(({ label }) => label.id),
  );
  const referenceLabels = new Set(
    reference.table.labels.map(({ label }) => label.id),
  );
  const sharedLabels = [...candidateLabels].filter((id) =>
    referenceLabels.has(id),
  ).length;
  const allLabels = new Set([...candidateLabels, ...referenceLabels]).size;
  const labelSimilarity = allLabels === 0 ? 0 : sharedLabels / allLabels;
  const sameSystem =
    candidate.table.systemeJeu.toLocaleLowerCase("fr-FR") ===
    reference.table.systemeJeu.toLocaleLowerCase("fr-FR");
  const startDistanceHours =
    Math.abs(
      candidate.table.startDatetime.getTime() -
        reference.table.startDatetime.getTime(),
    ) / 3_600_000;

  return (
    candidate.score * 0.25 +
    (sameSystem ? 50 : 0) +
    labelSimilarity * 30 +
    Math.max(0, 15 - startDistanceHours)
  );
}
