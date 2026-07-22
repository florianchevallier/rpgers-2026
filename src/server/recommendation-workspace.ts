import type {
  RecommendationSlotView,
  RecommendedTableView,
} from "@/domain/recommendation-contract";
import {
  type SavedPlan,
  type SavedSearch,
  savedPlanSchema,
  savedSearchSchema,
} from "@/domain/recommendation-workspace";
import {
  buildReplacementAlternatives,
  findPlanConflicts,
  isRecommendationEligible,
  type PlanConflict,
  type RecommendationPlan,
  type SpecificTableMatch,
} from "@/domain/recommendations";
import { db } from "@/server/db";
import { toRecommendedTableView } from "@/server/recommendations";
import type { RpgersTable } from "@/server/rpgers-schemas";

export type RecommendationWorkspaceView = {
  plan: {
    profileSummary: string;
    usedLlm: boolean;
    slots: RecommendationSlotView[];
  } | null;
  search: {
    query: string;
    profileSummary: string;
    usedLlm: boolean;
    matches: RecommendedTableView[];
  } | null;
};

export async function saveGeneratedPlan(
  userId: number,
  profileSummary: string,
  usedLlm: boolean,
  plan: RecommendationPlan,
): Promise<void> {
  const saved: SavedPlan = {
    profileSummary,
    usedLlm,
    slots: plan.slots.map((slot) => ({
      selected: { tableId: slot.selected.id, reason: slot.reason },
      alternatives: slot.alternatives.map(({ table, reason }) => ({
        tableId: table.id,
        reason,
      })),
    })),
  };
  await db.recommendationWorkspace.upsert({
    where: { userId },
    create: { userId, planJson: JSON.stringify(saved) },
    update: { planJson: JSON.stringify(saved) },
  });
}

export async function saveGeneratedSearch(
  userId: number,
  query: string,
  profileSummary: string,
  usedLlm: boolean,
  matches: SpecificTableMatch[],
): Promise<void> {
  const saved: SavedSearch = {
    query,
    profileSummary,
    usedLlm,
    matches: matches.map(({ table, reason }) => ({
      tableId: table.id,
      reason,
    })),
  };
  await db.recommendationWorkspace.upsert({
    where: { userId },
    create: { userId, searchJson: JSON.stringify(saved) },
    update: { searchJson: JSON.stringify(saved) },
  });
}

export async function loadRecommendationWorkspace(
  userId: number,
  isAdult: boolean,
  tables: RpgersTable[],
): Promise<RecommendationWorkspaceView> {
  const row = await db.recommendationWorkspace.findUnique({
    where: { userId },
  });
  if (!row) return { plan: null, search: null };
  const tableById = new Map(tables.map((table) => [table.id, table]));
  const savedPlan = parseJson(row.planJson, savedPlanSchema);
  const savedSearch = parseJson(row.searchJson, savedSearchSchema);

  return {
    plan: savedPlan ? hydratePlan(savedPlan, tableById) : null,
    search: savedSearch
      ? {
          query: savedSearch.query,
          profileSummary: savedSearch.profileSummary,
          usedLlm: savedSearch.usedLlm,
          matches: savedSearch.matches.flatMap((choice) => {
            const table = tableById.get(choice.tableId);
            return table &&
              isRecommendationEligible(table, {
                currentUserId: userId,
                isAdult,
              })
              ? [toRecommendedTableView(table, choice.reason)]
              : [];
          }),
        }
      : null,
  };
}

export async function clearWorkspacePart(
  userId: number,
  part: "plan" | "search",
): Promise<void> {
  await db.recommendationWorkspace.updateMany({
    where: { userId },
    data: part === "plan" ? { planJson: null } : { searchJson: null },
  });
}

export async function loadReplacementAlternatives({
  userId,
  isAdult,
  tables,
  tableId,
}: {
  userId: number;
  isAdult: boolean;
  tables: RpgersTable[];
  tableId: number;
}): Promise<RecommendedTableView[]> {
  const row = await db.recommendationWorkspace.findUnique({
    where: { userId },
  });
  const plan = parseJson(row?.planJson ?? null, savedPlanSchema);
  const tableById = new Map(tables.map((table) => [table.id, table]));
  const reference = tableById.get(tableId);
  if (!plan || !reference) return [];

  const isSelected = plan.slots.some(
    ({ selected }) => selected.tableId === tableId,
  );
  if (!isSelected) return [];

  const existing = plan.slots.flatMap(({ selected }) => {
    if (selected.tableId === tableId) return [];
    const table = tableById.get(selected.tableId);
    return table ? [table] : [];
  });

  return buildReplacementAlternatives(tables, reference, existing, {
    currentUserId: userId,
    isAdult,
  }).map(({ table, reason }) => toRecommendedTableView(table, reason));
}

export async function mutateSavedPlan({
  userId,
  isAdult,
  tables,
  action,
}: {
  userId: number;
  isAdult: boolean;
  tables: RpgersTable[];
  action:
    | { type: "add"; tableId: number; replaceTableId?: number }
    | { type: "replace"; tableId: number; replacementId: number }
    | { type: "remove"; tableId: number };
}): Promise<
  | { ok: true; workspace: RecommendationWorkspaceView }
  | { ok: false; message: string; conflicts: PlanConflict[] }
> {
  const row = await db.recommendationWorkspace.findUnique({
    where: { userId },
  });
  const plan = parseJson(row?.planJson ?? null, savedPlanSchema) ?? {
    profileSummary: "Une sélection construite et ajustée selon tes envies.",
    usedLlm: true,
    slots: [],
  };
  const tableById = new Map(tables.map((table) => [table.id, table]));

  if (action.type === "remove") {
    plan.slots = plan.slots.filter(
      ({ selected }) => selected.tableId !== action.tableId,
    );
  } else {
    const candidateId =
      action.type === "replace" ? action.replacementId : action.tableId;
    const candidate = tableById.get(candidateId);
    if (
      !candidate ||
      !isRecommendationEligible(candidate, { currentUserId: userId, isAdult })
    ) {
      return {
        ok: false,
        message: "Cette table n’est plus disponible.",
        conflicts: [],
      };
    }
    const replacedId =
      action.type === "replace" ? action.tableId : action.replaceTableId;
    const previousSlot = plan.slots.find(
      ({ selected }) => selected.tableId === replacedId,
    );
    if (replacedId && !previousSlot) {
      return {
        ok: false,
        message: "La table à remplacer n’est plus dans ton planning.",
        conflicts: [],
      };
    }
    const remainingSlots = plan.slots.filter(
      ({ selected }) => selected.tableId !== replacedId,
    );
    const existing = remainingSlots.flatMap(({ selected }) => {
      const table = tableById.get(selected.tableId);
      return table ? [table] : [];
    });
    const conflicts = findPlanConflicts(existing, candidate);
    if (conflicts.length > 0) {
      return {
        ok: false,
        message: conflictMessage(conflicts),
        conflicts,
      };
    }
    const search = parseJson(row?.searchJson ?? null, savedSearchSchema);
    const searchedReason = search?.matches.find(
      ({ tableId }) => tableId === candidate.id,
    )?.reason;
    const selected = {
      tableId: candidate.id,
      reason:
        searchedReason ??
        previousSlot?.selected.reason ??
        "Cette table a été ajoutée manuellement à ta sélection.",
    };
    const newSlot = {
      selected,
      alternatives: previousSlot
        ? [
            previousSlot.selected,
            ...previousSlot.alternatives.filter(
              ({ tableId }) => tableId !== candidate.id,
            ),
          ]
        : [],
    };
    plan.slots = [...remainingSlots, newSlot].toSorted((left, right) => {
      const leftTable = tableById.get(left.selected.tableId);
      const rightTable = tableById.get(right.selected.tableId);
      return (
        (leftTable?.startDatetime.getTime() ?? 0) -
        (rightTable?.startDatetime.getTime() ?? 0)
      );
    });
  }

  await db.recommendationWorkspace.upsert({
    where: { userId },
    create: { userId, planJson: JSON.stringify(plan) },
    update: { planJson: JSON.stringify(plan) },
  });
  return {
    ok: true,
    workspace: await loadRecommendationWorkspace(userId, isAdult, tables),
  };
}

function hydratePlan(
  saved: SavedPlan,
  tableById: ReadonlyMap<number, RpgersTable>,
): NonNullable<RecommendationWorkspaceView["plan"]> {
  return {
    profileSummary: saved.profileSummary,
    usedLlm: saved.usedLlm,
    slots: saved.slots.flatMap((slot) => {
      const selected = tableById.get(slot.selected.tableId);
      if (!selected) return [];
      return [
        {
          slotId: selected.id,
          selected: toRecommendedTableView(selected, slot.selected.reason),
          alternatives: slot.alternatives.flatMap((choice) => {
            const table = tableById.get(choice.tableId);
            return table ? [toRecommendedTableView(table, choice.reason)] : [];
          }),
        },
      ];
    }),
  };
}

function parseJson<T>(
  raw: string | null,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): T | null {
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data ?? null) : null;
  } catch {
    return null;
  }
}

function conflictMessage(conflicts: PlanConflict[]): string {
  if (conflicts.some(({ type }) => type === "duplicate-scenario")) {
    return "Ce scénario est déjà présent dans ton planning.";
  }
  if (conflicts.some(({ type }) => type === "overlap")) {
    return "Cette table chevauche une partie déjà sélectionnée.";
  }
  return "Cette table ne laisse plus une heure complète pour le repas.";
}
