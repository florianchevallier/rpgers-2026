import { seatState } from "@/domain/schedule";
import { cn } from "@/lib/utils";
import type { RpgersTable } from "@/server/rpgers-schemas";

type Props = {
  table: Pick<
    RpgersTable,
    "placesLibresPubliques" | "maxPlayers" | "confirmed"
  >;
  size?: "sm" | "md";
};

const LABELS = {
  open: "places libres",
  last: "dernière place !",
  full: "complet",
} as const;

/** Sceau de cire — compteur de places, élément signature de Critiquest. */
export function SeatSeal({ table, size = "md" }: Props) {
  const state = seatState(table);
  const taken = table.confirmed;
  return (
    <div
      className={cn(
        "seat-seal shrink-0",
        size === "md" ? "size-14 text-lg" : "size-10 text-sm",
      )}
      data-state={state}
      role="img"
      aria-label={`${taken} inscrits sur ${table.maxPlayers}, ${LABELS[state]}`}
    >
      <span className="leading-none tabular-nums">
        {taken}
        <span className="opacity-70 text-[0.65em]">/{table.maxPlayers}</span>
      </span>
    </div>
  );
}
