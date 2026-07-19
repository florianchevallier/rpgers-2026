"use client";

import Fuse from "fuse.js";
import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { FilterBar } from "@/components/tables/filter-bar";
import { TableCard } from "@/components/tables/table-card";
import { applyFilters, isMine, searchKeys } from "@/domain/filters";
import type { CatalogLabel } from "@/domain/labels";
import { formatDayTitle, groupTablesByDay, roman } from "@/domain/schedule";
import { useTableFilters } from "@/lib/filter-params";
import type { RpgersTable } from "@/server/rpgers-schemas";

type Props = {
  tables: RpgersTable[];
  labelsCatalog: CatalogLabel[];
  currentUserId: number;
  /** ids des joueurs/MJ favoris (Set non sérialisable côté serveur → array) */
  favoriteIds: number[];
  /** annuaire id→pseudo des inscrits (Map non sérialisable → paires) */
  knownPlayers: [number, string][];
};

/** Explorateur : filtres URL + recherche floue + liste groupée par jour. */
export function TablesExplorer({
  tables,
  labelsCatalog,
  currentUserId,
  favoriteIds,
  knownPlayers,
}: Props) {
  const { filters } = useTableFilters();
  const [query, setQuery] = useState("");

  const now = useMemo(() => new Date(), []);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const pseudoById = useMemo(() => new Map(knownPlayers), [knownPlayers]);
  const myTables = useMemo(
    () => tables.filter((t) => isMine(t, currentUserId)),
    [tables, currentUserId],
  );

  // MJ disponibles (dérivés des données, triés)
  const mjs = useMemo(
    () =>
      [...new Set(tables.map((t) => t.owner.pseudo))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [tables],
  );

  // Fuse : index reconstruit uniquement si les tablées changent
  const fuse = useMemo(
    () =>
      new Fuse(tables, {
        keys: [
          { name: "titre", weight: 2 },
          "systemeJeu",
          "description",
          { name: "owner.pseudo", getFn: (t) => searchKeys(t).mj },
        ],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [tables],
  );

  const visible = useMemo(() => {
    let result = applyFilters(tables, filters, {
      now,
      currentUserId,
      myTables,
      favoriteIds: favoriteIdSet,
    });
    if (query.trim().length >= 2) {
      const hits = new Set(fuse.search(query).map((h) => h.item.id));
      result = result.filter((t) => hits.has(t.id));
    }
    return result;
  }, [
    tables,
    filters,
    now,
    currentUserId,
    myTables,
    favoriteIdSet,
    query,
    fuse,
  ]);

  const days = useMemo(() => groupTablesByDay(visible), [visible]);
  const allDays = useMemo(() => groupTablesByDay(tables), [tables]);
  // numérotation des jours figée sur l'évènement complet (pas la liste filtrée)
  const dayNumberByKey = useMemo(
    () => new Map(allDays.map((d) => [d.key, d.dayNumber])),
    [allDays],
  );

  return (
    <div className="flex flex-col gap-6">
      <FilterBar
        days={allDays}
        labels={labelsCatalog}
        mjs={mjs}
        query={query}
        onQueryChange={setQuery}
      />

      {days.length === 0 ? (
        <div className="grid place-items-center py-16 text-center">
          <SearchX className="size-10 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-muted-foreground">
            Aucune tablée ne correspond — élargis tes filtres.
          </p>
        </div>
      ) : (
        days.map((day) => (
          <section key={day.key} aria-labelledby={`day-${day.key}`}>
            <div className="day-heading-sticky">
              <h2 id={`day-${day.key}`} className="day-heading">
                Jour {roman(dayNumberByKey.get(day.key) ?? day.dayNumber)} —{" "}
                {formatDayTitle(day.date)}
              </h2>
              <div className="mt-1 border-t border-primary/30" aria-hidden />
              <p className="mt-1 text-xs text-muted-foreground">
                {day.tables.length} tablée{day.tables.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {day.tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  pseudoById={pseudoById}
                  favoriteIds={favoriteIdSet}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
