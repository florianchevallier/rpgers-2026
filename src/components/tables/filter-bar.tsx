"use client";

import { ChevronsUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { FilterPresetsMenu } from "@/components/tables/filter-presets-menu";
import { LabelFilterRow } from "@/components/tables/label-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CatalogLabel } from "@/domain/labels";
import type { DayGroup } from "@/domain/schedule";
import { useTableFilters } from "@/lib/filter-params";
import { cn } from "@/lib/utils";

type Props = {
  days: Array<Pick<DayGroup, "key" | "date">>;
  labels: CatalogLabel[];
  mjs: string[];
  query: string;
  onQueryChange: (q: string) => void;
};

const shortDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  timeZone: "Europe/Paris",
});

export function FilterBar({ days, labels, mjs, query, onQueryChange }: Props) {
  const { params, setParams, activeCount, RESET } = useTableFilters();
  const [labelsOpen, setLabelsOpen] = useState(false);

  const toggleIncludeLabel = (id: number) => {
    const included = params.labels.includes(id);
    setParams({
      labels: included
        ? params.labels.filter((labelId) => labelId !== id)
        : [...params.labels, id],
      excludedLabels: params.excludedLabels.filter((labelId) => labelId !== id),
    });
  };

  const toggleExcludeLabel = (id: number) => {
    const excluded = params.excludedLabels.includes(id);
    setParams({
      excludedLabels: excluded
        ? params.excludedLabels.filter((labelId) => labelId !== id)
        : [...params.excludedLabels, id],
      labels: params.labels.filter((labelId) => labelId !== id),
    });
  };

  const labelCount = params.labels.length + params.excludedLabels.length;
  const includedLabelIds = new Set(params.labels);
  const excludedLabelIds = new Set(params.excludedLabels);

  return (
    <section aria-label="Recherche et filtres" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Titre, système ou MJ…"
            className="h-11 bg-card pl-9 pr-10 shadow-xs"
            aria-label="Rechercher une partie"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg" className="h-11 bg-card px-3">
              <SlidersHorizontal className="size-4" aria-hidden />
              <span>Filtres</span>
              {activeCount > 0 && (
                <Badge className="min-w-5 justify-center px-1.5">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[min(92vw,24rem)] max-w-none gap-0"
          >
            <SheetHeader className="border-b border-border px-5 py-5">
              <SheetTitle className="text-lg font-semibold">Filtres</SheetTitle>
              <SheetDescription>
                Les résultats se mettent à jour immédiatement.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">
                  Disponibilité
                </legend>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={params.hideConflicting}
                    onClick={() =>
                      setParams({
                        hideConflicting: !params.hideConflicting,
                      })
                    }
                  >
                    Sans conflit
                  </FilterChip>
                  <FilterChip
                    active={params.past}
                    onClick={() => setParams({ past: !params.past })}
                  >
                    Parties passées
                  </FilterChip>
                </div>
              </fieldset>

              <div>
                <p className="mb-2 text-sm font-semibold">Thèmes et contenus</p>
                <Popover open={labelsOpen} onOpenChange={setLabelsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        Labels
                        {labelCount > 0 && (
                          <Badge className="px-1.5">{labelCount}</Badge>
                        )}
                      </span>
                      <ChevronsUpDown
                        className="size-3.5 text-muted-foreground"
                        aria-hidden
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[min(20rem,calc(100vw-2rem))] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Rechercher un label…" />
                      <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                        Sélectionner pour inclure · symbole barré pour exclure
                      </p>
                      <CommandList>
                        <CommandEmpty>Aucun label.</CommandEmpty>
                        <CommandGroup>
                          {labels.map((label) => {
                            const state = includedLabelIds.has(label.id)
                              ? "included"
                              : excludedLabelIds.has(label.id)
                                ? "excluded"
                                : "none";
                            return (
                              <LabelFilterRow
                                key={label.id}
                                nom={label.nom}
                                couleur={label.couleur}
                                state={state}
                                onToggleInclude={() =>
                                  toggleIncludeLabel(label.id)
                                }
                                onToggleExclude={() =>
                                  toggleExcludeLabel(label.id)
                                }
                              />
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {mjs.length > 0 && (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold">
                    Maître ou maîtresse de jeu
                  </legend>
                  <label className="grid gap-1.5 text-xs text-muted-foreground">
                    Inclure
                    <select
                      value={params.mj ?? ""}
                      onChange={(event) =>
                        setParams({
                          mj: event.target.value || null,
                          excludedMj: event.target.value
                            ? null
                            : params.excludedMj,
                        })
                      }
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    >
                      <option value="">Tous les MJ</option>
                      {mjs.map((mj) => (
                        <option key={mj} value={mj}>
                          {mj}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs text-muted-foreground">
                    Exclure
                    <select
                      value={params.excludedMj ?? ""}
                      onChange={(event) =>
                        setParams({
                          excludedMj: event.target.value || null,
                          mj: event.target.value ? null : params.mj,
                        })
                      }
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    >
                      <option value="">Aucune exclusion</option>
                      {mjs.map((mj) => (
                        <option key={mj} value={mj}>
                          {mj}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold">
                  Filtres enregistrés
                </p>
                <FilterPresetsMenu currentParams={params} onApply={setParams} />
              </div>
            </div>

            <SheetFooter className="grid grid-cols-2 border-t border-border p-4">
              <Button
                type="button"
                variant="outline"
                disabled={activeCount === 0}
                onClick={() => setParams(RESET)}
              >
                Réinitialiser
              </Button>
              <SheetClose asChild>
                <Button type="button">Afficher</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <fieldset className="horizontal-scroll -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <legend className="sr-only">Filtrer par jour</legend>
        <FilterChip
          active={params.day === null}
          onClick={() => setParams({ day: null })}
        >
          Tous les jours
        </FilterChip>
        {days.map((day) => (
          <FilterChip
            key={day.key}
            active={params.day === day.key}
            onClick={() =>
              setParams({ day: params.day === day.key ? null : day.key })
            }
          >
            {shortDayFormatter.format(day.date)}
          </FilterChip>
        ))}
      </fieldset>

      <fieldset className="horizontal-scroll -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <legend className="sr-only">Filtres rapides</legend>
        <FilterChip
          active={params.free}
          onClick={() => setParams({ free: !params.free })}
        >
          Places disponibles
        </FilterChip>
        <FilterChip
          active={params.mine}
          onClick={() => setParams({ mine: !params.mine })}
        >
          Mes parties
        </FilterChip>
        <FilterChip
          active={params.favorites}
          onClick={() => setParams({ favorites: !params.favorites })}
        >
          Mes favoris
        </FilterChip>
      </fieldset>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
