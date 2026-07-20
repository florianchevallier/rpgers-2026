import { seatState } from "@/domain/schedule";
import { cn } from "@/lib/utils";
import type { RpgersTable } from "@/server/rpgers-schemas";

type Props = {
  table: Pick<
    RpgersTable,
    "placesLibresPubliques" | "placesLibresTotal" | "maxPlayers" | "confirmed"
  >;
  size?: "sm" | "md";
};

const LABELS = {
  open: "places publiques disponibles",
  last: "dernière place publique disponible",
  adminOnly: "places réservées à la tente JDR uniquement",
  full: "complet",
} as const;

export function SeatSeal({ table, size = "md" }: Props) {
  const state = seatState(table);
  const publicSeats = table.placesLibresPubliques;
  const label =
    state === "open"
      ? `${publicSeats} places`
      : state === "last"
        ? "Dernière place"
        : state === "adminOnly"
          ? size === "sm"
            ? "Sur place"
            : "Inscriptions sur place"
          : "Complet";

  const responsiveLabel =
    state === "adminOnly" && size === "md" ? (
      <>
        <span className="lg:hidden">Sur place</span>
        <span className="hidden lg:inline">Inscriptions sur place</span>
      </>
    ) : (
      label
    );

  return (
    <div
      className={cn(
        "seat-status",
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs",
      )}
      data-state={state}
      role="img"
      aria-label={`${table.confirmed} inscrit${table.confirmed > 1 ? "s" : ""} sur ${table.maxPlayers}, ${LABELS[state]}`}
    >
      <span className="seat-status-dot" aria-hidden />
      <strong className="font-medium tabular-nums">{responsiveLabel}</strong>
    </div>
  );
}
