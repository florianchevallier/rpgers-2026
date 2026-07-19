"use client";

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import type { TableFilters } from "@/domain/filters";

/**
 * Filtres synchronisés à l'URL (nuqs) — partageables et persistants au refresh.
 * `q` (recherche floue) reste local : pas utile dans l'URL.
 */
export const filterParsers = {
  day: parseAsString,
  labels: parseAsArrayOf(parseAsInteger).withDefault([]),
  excludedLabels: parseAsArrayOf(parseAsInteger).withDefault([]),
  mj: parseAsString,
  excludedMj: parseAsString,
  free: parseAsBoolean.withDefault(false),
  mine: parseAsBoolean.withDefault(false),
  past: parseAsBoolean.withDefault(false), // afficher les passées (défaut : masquées)
  hideConflicting: parseAsBoolean.withDefault(false),
  favorites: parseAsBoolean.withDefault(false),
};

/** Forme des filtres persistables (URL ou preset sauvegardé). */
export type FilterParams = {
  day: string | null;
  labels: number[];
  excludedLabels: number[];
  mj: string | null;
  excludedMj: string | null;
  free: boolean;
  mine: boolean;
  past: boolean;
  hideConflicting: boolean;
  favorites: boolean;
};

export function useTableFilters() {
  const [params, setParams] = useQueryStates(filterParsers, {
    history: "replace",
    shallow: true,
  });

  const filters: TableFilters = {
    day: params.day ?? undefined,
    labelIds: params.labels,
    excludedLabelIds: params.excludedLabels,
    mj: params.mj ?? undefined,
    excludedMj: params.excludedMj ?? undefined,
    freeSeatsOnly: params.free,
    mineOnly: params.mine,
    hidePast: !params.past,
    hideConflicting: params.hideConflicting,
    favoritesOnly: params.favorites,
  };

  const activeCount =
    (params.day ? 1 : 0) +
    params.labels.length +
    params.excludedLabels.length +
    (params.mj ? 1 : 0) +
    (params.excludedMj ? 1 : 0) +
    (params.free ? 1 : 0) +
    (params.mine ? 1 : 0) +
    (params.hideConflicting ? 1 : 0) +
    (params.favorites ? 1 : 0);

  const RESET: FilterParams = {
    day: null,
    labels: [],
    excludedLabels: [],
    mj: null,
    excludedMj: null,
    free: false,
    mine: false,
    past: params.past, // "passées" n'est pas un filtre actif au sens du compteur — on le laisse tel quel
    hideConflicting: false,
    favorites: false,
  };

  return { filters, params, setParams, activeCount, RESET };
}
