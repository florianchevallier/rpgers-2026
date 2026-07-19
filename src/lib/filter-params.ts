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
  mj: parseAsString,
  free: parseAsBoolean.withDefault(false),
  mine: parseAsBoolean.withDefault(false),
  past: parseAsBoolean.withDefault(false), // afficher les passées (défaut : masquées)
};

export function useTableFilters() {
  const [params, setParams] = useQueryStates(filterParsers, {
    history: "replace",
    shallow: true,
  });

  const filters: TableFilters = {
    day: params.day ?? undefined,
    labelIds: params.labels,
    mj: params.mj ?? undefined,
    freeSeatsOnly: params.free,
    mineOnly: params.mine,
    hidePast: !params.past,
  };

  const activeCount =
    (params.day ? 1 : 0) +
    params.labels.length +
    (params.mj ? 1 : 0) +
    (params.free ? 1 : 0) +
    (params.mine ? 1 : 0);

  return { filters, params, setParams, activeCount };
}
