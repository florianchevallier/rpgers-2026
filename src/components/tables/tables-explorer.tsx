"use client";

import type Fuse from "fuse.js";
import { SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FilterBar } from "@/components/tables/filter-bar";
import { TableCard } from "@/components/tables/table-card";
import { applyFilters, isMine, searchKeys } from "@/domain/filters";
import type { CatalogLabel } from "@/domain/labels";
import { formatDayTitle, groupTablesByDay } from "@/domain/schedule";
import type { RpgersTableListItem } from "@/domain/table-list";
import { useTableFilters } from "@/lib/filter-params";

type Props = {
  tables: RpgersTableListItem[];
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
  const [fuseState, setFuseState] = useState<{
    source: RpgersTableListItem[];
    index: Fuse<RpgersTableListItem>;
  } | null>(null);
  const fuse = fuseState?.source === tables ? fuseState.index : null;

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

  // Fuse est chargé uniquement quand l'utilisateur commence une recherche :
  // le bundle initial de la home reste plus léger sur réseau contraint.
  useEffect(() => {
    if (query.trim().length < 2 || fuse) return;
    let cancelled = false;
    void import("fuse.js").then(({ default: FuseSearch }) => {
      if (cancelled) return;
      setFuseState({
        source: tables,
        index: new FuseSearch(tables, {
          keys: [
            { name: "titre", weight: 2 },
            "systemeJeu",
            { name: "owner.pseudo", getFn: (t) => searchKeys(t).mj },
          ],
          threshold: 0.3,
          ignoreLocation: true,
        }),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [query, tables, fuse]);

  const visible = useMemo(() => {
    let result = applyFilters(tables, filters, {
      now,
      currentUserId,
      myTables,
      favoriteIds: favoriteIdSet,
    });
    if (query.trim().length >= 2) {
      const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
      const hits = new Set<number>();
      if (fuse) {
        for (const hit of fuse.search(query)) hits.add(hit.item.id);
      } else {
        for (const table of tables) {
          const matches = Object.values(searchKeys(table)).some((value) =>
            value.toLocaleLowerCase("fr-FR").includes(normalizedQuery),
          );
          if (matches) hits.add(table.id);
        }
      }
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
  const dayNumberByKey = useMemo(
    () => new Map(allDays.map((day) => [day.key, day.dayNumber])),
    [allDays],
  );
  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            RPGers 2026 · 14–16 août
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Parties
          </h1>
        </div>
        <p className="shrink-0 pb-1 text-sm tabular-nums text-muted-foreground">
          {visible.length} résultat{visible.length > 1 ? "s" : ""}
        </p>
      </header>

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
            Aucune partie ne correspond à ces critères.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {days.map((day) => (
            <section key={day.key} aria-labelledby={`day-${day.key}`}>
              <div className="day-heading-sticky">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                    Jour {dayNumberByKey.get(day.key) ?? day.dayNumber}
                  </p>
                  <h2 id={`day-${day.key}`} className="day-heading capitalize">
                    {formatDayTitle(day.date)}
                  </h2>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {day.tables.length} partie{day.tables.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="grid gap-2.5 pt-3 sm:rounded-b-xl sm:border-x sm:border-b sm:border-border/80 sm:bg-muted/25 sm:p-3">
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
          ))}
        </div>
      )}
    </div>
  );
}
