import { CalendarClock, MapPin, User } from "lucide-react";
import Link from "next/link";
import { LabelChip } from "@/components/tables/label-badge";
import { PlayersStrip } from "@/components/tables/players-strip";
import { SeatSeal } from "@/components/tables/seat-seal";
import { buildPlayerChips } from "@/domain/players";
import { formatSlot } from "@/domain/schedule";
import type { RpgersTable } from "@/server/rpgers-schemas";

type Props = {
  table: RpgersTable;
  /** annuaire id→pseudo (résolu côté serveur) — absent = pas de strip joueurs */
  pseudoById?: ReadonlyMap<number, string>;
  favoriteIds?: ReadonlySet<number>;
};

/** Carte tablée = avis de quête épinglé au panneau de la taverne. */
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
  return (
    <Link
      href={`/tables/${table.id}`}
      className="group block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* créneau + salle */}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
              <CalendarClock className="size-3.5" aria-hidden />
              {formatSlot(table.startDatetime, table.endDatetime)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {table.salle.nom}
            </span>
          </p>

          {/* titre en Cinzel + système en italique */}
          <h3 className="mt-1.5 font-heading text-lg font-semibold leading-snug tracking-wide group-hover:text-primary">
            {table.titre}
          </h3>
          <p className="text-sm italic text-muted-foreground">
            {table.systemeJeu}
          </p>

          {/* MJ */}
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <User className="size-3.5" aria-hidden />
            menée par{" "}
            <span className="font-semibold">{table.owner.pseudo}</span>
          </p>

          {/* labels */}
          {table.labels.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {table.labels.map(({ label }) => (
                <LabelChip
                  key={label.id}
                  nom={label.nom}
                  couleur={label.couleur}
                />
              ))}
            </div>
          )}

          {/* joueurs présents (favoris en liseré doré) */}
          <PlayersStrip players={players} max={4} className="mt-2.5" />
        </div>

        <SeatSeal table={table} />
      </div>
    </Link>
  );
}
