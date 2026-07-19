import { CalendarClock, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { LabelChip } from "@/components/tables/label-badge";
import { PlayersStrip } from "@/components/tables/players-strip";
import { SeatSeal } from "@/components/tables/seat-seal";
import { buildPlayerChips } from "@/domain/players";
import { formatSlot } from "@/domain/schedule";
import type { RpgersTableListItem } from "@/domain/table-list";

type Props = {
  table: RpgersTableListItem;
  /** annuaire id→pseudo (résolu côté serveur) — absent = pas de strip joueurs */
  pseudoById?: ReadonlyMap<number, string>;
  favoriteIds?: ReadonlySet<number>;
};

export function TableCard({
  table,
  pseudoById = new Map(),
  favoriteIds = new Set(),
}: Props) {
  const players = buildPlayerChips(
    table.registrations,
    pseudoById,
    favoriteIds,
  );
  const visibleLabels = table.labels.slice(0, 3);
  const hiddenLabelCount = table.labels.length - visibleLabels.length;

  return (
    <Link
      href={`/tables/${table.id}`}
      className="table-card group block w-full min-w-0 overflow-hidden rounded-xl border border-border/90 bg-card p-4 shadow-xs transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:gap-x-6">
        <p className="col-start-1 row-start-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 self-start text-xs text-muted-foreground sm:flex-col sm:items-start sm:gap-2">
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <CalendarClock className="size-3.5" aria-hidden />
            {formatSlot(table.startDatetime, table.endDatetime)}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{table.salle.nom}</span>
          </span>
        </p>

        <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
            {table.titre}
          </h3>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="truncate font-medium text-foreground/80">
              {table.systemeJeu}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <UserRound className="size-3.5" aria-hidden />
              <span className="truncate">{table.owner.pseudo}</span>
            </span>
          </p>

          {table.labels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {visibleLabels.map(({ label }, index) => (
                <LabelChip
                  key={label.id}
                  nom={label.nom}
                  couleur={label.couleur}
                  className={
                    index === 1
                      ? "max-[359px]:hidden"
                      : index === 2
                        ? "hidden sm:inline-flex"
                        : undefined
                  }
                />
              ))}
              {hiddenLabelCount > 0 && (
                <span className="hidden items-center px-1 text-xs text-muted-foreground sm:inline-flex">
                  +{hiddenLabelCount}
                </span>
              )}
            </div>
          )}

          <PlayersStrip players={players} max={2} className="mt-3 sm:hidden" />
          <PlayersStrip
            players={players}
            max={3}
            className="mt-3 hidden sm:flex"
          />
        </div>

        <div className="col-start-2 row-start-1 justify-self-end sm:col-start-3">
          <SeatSeal table={table} size="sm" />
        </div>
      </div>
    </Link>
  );
}
