import { dayKey } from "@/domain/schedule";
import type { RpgersTable } from "@/server/rpgers-schemas";

/**
 * Filtres de la liste des tablées — logique PURE (testée).
 * Reprise durcie du clone 2024 : logique ET sur les labels.
 */

export type TableFilters = {
  /** jour au format dayKey (YYYY-MM-DD) ; undefined = tous */
  day?: string;
  /** labels requis (ET : la tablée doit tous les porter) */
  labelIds: number[];
  /** pseudo exact du MJ */
  mj?: string;
  /** uniquement les tablées avec ≥ 1 place publique */
  freeSeatsOnly: boolean;
  /** uniquement mes parties (inscrit ou MJ) */
  mineOnly: boolean;
  /** masquer les tablées passées */
  hidePast: boolean;
};

export const DEFAULT_FILTERS: TableFilters = {
  labelIds: [],
  freeSeatsOnly: false,
  mineOnly: false,
  hidePast: true,
};

export function isRegistered(table: RpgersTable, userId: number): boolean {
  return table.registrations.some(
    (r) => r.userId === userId && r.statut === "confirmed",
  );
}

export function isMine(table: RpgersTable, userId: number): boolean {
  return table.ownerId === userId || isRegistered(table, userId);
}

export function applyFilters(
  tables: RpgersTable[],
  filters: TableFilters,
  now: Date,
  currentUserId: number,
): RpgersTable[] {
  return tables.filter((table) => {
    if (filters.hidePast && table.endDatetime < now) return false;
    if (filters.day && dayKey(table.startDatetime) !== filters.day)
      return false;
    if (filters.mj && table.owner.pseudo !== filters.mj) return false;
    if (filters.freeSeatsOnly && table.placesLibresPubliques <= 0) return false;
    if (filters.mineOnly && !isMine(table, currentUserId)) return false;
    if (filters.labelIds.length > 0) {
      const tableLabelIds = new Set(table.labels.map((l) => l.labelId));
      if (!filters.labelIds.every((id) => tableLabelIds.has(id))) return false;
    }
    return true;
  });
}

/**
 * Clés de recherche floue (Fuse.js) — titre, description, système, MJ.
 * NB : les inscrits n'embarquent que leur userId dans la liste → non cherchables.
 */
export function searchKeys(table: RpgersTable): Record<string, string> {
  return {
    titre: table.titre,
    description: table.description,
    systemeJeu: table.systemeJeu,
    mj: table.owner.pseudo,
  };
}
