"use client";

import { ChevronsUpDown, Search, X } from "lucide-react";
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
import type { CatalogLabel } from "@/domain/labels";
import type { DayGroup } from "@/domain/schedule";
import { roman } from "@/domain/schedule";
import { useTableFilters } from "@/lib/filter-params";
import { cn } from "@/lib/utils";

type Props = {
  days: DayGroup[];
  labels: CatalogLabel[];
  mjs: string[];
  query: string;
  onQueryChange: (q: string) => void;
};

/** Barre de filtres — recherche + chips jours + toggles + popover labels + MJ + presets. */
export function FilterBar({ days, labels, mjs, query, onQueryChange }: Props) {
  const { params, setParams, activeCount, RESET } = useTableFilters();
  const [labelsOpen, setLabelsOpen] = useState(false);

  const toggleIncludeLabel = (id: number) => {
    const included = params.labels.includes(id);
    setParams({
      labels: included
        ? params.labels.filter((l) => l !== id)
        : [...params.labels, id],
      // inclure retire automatiquement toute exclusion contradictoire
      excludedLabels: params.excludedLabels.filter((l) => l !== id),
    });
  };

  const toggleExcludeLabel = (id: number) => {
    const excluded = params.excludedLabels.includes(id);
    setParams({
      excludedLabels: excluded
        ? params.excludedLabels.filter((l) => l !== id)
        : [...params.excludedLabels, id],
      labels: params.labels.filter((l) => l !== id),
    });
  };

  const labelCount = params.labels.length + params.excludedLabels.length;
  const includedLabelIds = new Set(params.labels);
  const excludedLabelIds = new Set(params.excludedLabels);

  return (
    <div className="flex flex-col gap-3">
      {/* recherche floue */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Rechercher une tablée, un système, un MJ…"
          className="pl-9"
          aria-label="Rechercher"
        />
      </div>

      {/* chips jours + toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
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
            Jour {roman(day.dayNumber)}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <FilterChip
          active={params.free}
          onClick={() => setParams({ free: !params.free })}
        >
          Places libres
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
        <FilterChip
          active={params.hideConflicting}
          onClick={() =>
            setParams({ hideConflicting: !params.hideConflicting })
          }
        >
          Masquer les conflits
        </FilterChip>
        <FilterChip
          active={params.past}
          onClick={() => setParams({ past: !params.past })}
        >
          Passées
        </FilterChip>
      </div>

      {/* labels + MJ + presets + reset */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Popover open={labelsOpen} onOpenChange={setLabelsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              Labels
              {labelCount > 0 && <Badge className="px-1.5">{labelCount}</Badge>}
              <ChevronsUpDown
                className="size-3.5 text-muted-foreground"
                aria-hidden
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Filtrer les labels…" />
              <p className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
                Clic = inclure · <span aria-hidden>⊘</span> = exclure
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
                        onToggleInclude={() => toggleIncludeLabel(label.id)}
                        onToggleExclude={() => toggleExcludeLabel(label.id)}
                      />
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {mjs.length > 0 && (
          <>
            <select
              value={params.mj ?? ""}
              onChange={(e) =>
                setParams({
                  mj: e.target.value || null,
                  excludedMj: e.target.value ? null : params.excludedMj,
                })
              }
              aria-label="Filtrer par MJ"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Tous les MJ</option>
              {mjs.map((mj) => (
                <option key={mj} value={mj}>
                  {mj}
                </option>
              ))}
            </select>
            <select
              value={params.excludedMj ?? ""}
              onChange={(e) =>
                setParams({
                  excludedMj: e.target.value || null,
                  mj: e.target.value ? null : params.mj,
                })
              }
              aria-label="Exclure un MJ"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-muted-foreground"
            >
              <option value="">Exclure un MJ…</option>
              {mjs.map((mj) => (
                <option key={mj} value={mj}>
                  {mj}
                </option>
              ))}
            </select>
          </>
        )}

        <FilterPresetsMenu currentParams={params} onApply={setParams} />

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setParams(RESET)}
            className="gap-1 text-muted-foreground"
          >
            <X className="size-3.5" aria-hidden />
            Réinitialiser ({activeCount})
          </Button>
        )}
      </div>
    </div>
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
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary/15 font-semibold text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
