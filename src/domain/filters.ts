import { dayKey, slotsOverlap } from "@/domain/schedule";
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
  /** labels exclus (aucun ne doit être présent) */
  excludedLabelIds: number[];
  /** pseudo exact du MJ */
  mj?: string;
  /** pseudo exact du MJ à exclure */
  excludedMj?: string;
  /** uniquement les tablées avec ≥ 1 place publique */
  freeSeatsOnly: boolean;
  /** uniquement mes parties (inscrit ou MJ) */
  mineOnly: boolean;
  /** masquer les tablées passées */
  hidePast: boolean;
  /** masquer les tablées en conflit d'horaire avec mon planning */
  hideConflicting: boolean;
  /** uniquement les tablées où un joueur/MJ favori participe */
  favoritesOnly: boolean;
};

export const DEFAULT_FILTERS: TableFilters = {
  labelIds: [],
  excludedLabelIds: [],
  freeSeatsOnly: false,
  mineOnly: false,
  hidePast: true,
  hideConflicting: false,
  favoritesOnly: false,
};

export function isRegistered(table: RpgersTable, userId: number): boolean {
  return table.registrations.some(
    (r) => r.userId === userId && r.statut === "confirmed",
  );
}

export function isMine(table: RpgersTable, userId: number): boolean {
  return table.ownerId === userId || isRegistered(table, userId);
}

/** La tablée compte-t-elle un participant (MJ ou joueur) parmi les favoris ? */
export function hasFavoriteParticipant(
  table: RpgersTable,
  favoriteIds: ReadonlySet<number>,
): boolean {
  if (favoriteIds.has(table.ownerId)) return true;
  return table.registrations.some((r) => favoriteIds.has(r.userId));
}

/** Contexte nécessaire aux filtres qui dépendent d'autre chose que la tablée elle-même. */
export type FilterContext = {
  now: Date;
  currentUserId: number;
  /** mes tablées (MJ ou inscrit) — pour détecter les conflits d'horaire */
  myTables: RpgersTable[];
  /** ids des joueurs/MJ favoris — pour favoritesOnly */
  favoriteIds: ReadonlySet<number>;
};

export function applyFilters(
  tables: RpgersTable[],
  filters: TableFilters,
  ctx: FilterContext,
): RpgersTable[] {
  return tables.filter((table) => {
    if (filters.hidePast && table.endDatetime < ctx.now) return false;
    if (filters.day && dayKey(table.startDatetime) !== filters.day)
      return false;
    if (filters.mj && table.owner.pseudo !== filters.mj) return false;
    if (filters.excludedMj && table.owner.pseudo === filters.excludedMj)
      return false;
    if (filters.freeSeatsOnly && table.placesLibresPubliques <= 0) return false;
    if (filters.mineOnly && !isMine(table, ctx.currentUserId)) return false;
    if (filters.labelIds.length > 0) {
      const tableLabelIds = new Set(table.labels.map((l) => l.labelId));
      if (!filters.labelIds.every((id) => tableLabelIds.has(id))) return false;
    }
    if (filters.excludedLabelIds.length > 0) {
      const tableLabelIds = new Set(table.labels.map((l) => l.labelId));
      if (filters.excludedLabelIds.some((id) => tableLabelIds.has(id)))
        return false;
    }
    if (
      filters.favoritesOnly &&
      !hasFavoriteParticipant(table, ctx.favoriteIds)
    )
      return false;
    if (
      filters.hideConflicting &&
      !isMine(table, ctx.currentUserId) &&
      ctx.myTables.some((mine) =>
        slotsOverlap(
          { start: table.startDatetime, end: table.endDatetime },
          { start: mine.startDatetime, end: mine.endDatetime },
        ),
      )
    )
      return false;
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
