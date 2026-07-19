import type { RpgersTable } from "@/server/rpgers-schemas";

/**
 * Logique pure de planning — testée unitairement (CLAUDE.md §4 : domain/).
 * Aucune dépendance React/Next ici.
 */

/** Chiffres romains pour les en-têtes de journées (Jour I, II, III…). */
export function roman(n: number): string {
  const table: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let rest = n;
  let out = "";
  for (const [value, glyph] of table) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

/** Clé de jour locale YYYY-MM-DD (fuseau de la convention = fuseau de l'utilisateur). */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DayGroup = {
  key: string;
  date: Date;
  /** 1 = Jour I, 2 = Jour II… (index dans l'évènement) */
  dayNumber: number;
  tables: RpgersTable[];
};

/** Groupe les tablées par jour, triées chronologiquement. */
export function groupTablesByDay(tables: RpgersTable[]): DayGroup[] {
  const byDay = new Map<string, RpgersTable[]>();
  for (const table of tables) {
    const key = dayKey(table.startDatetime);
    const list = byDay.get(key) ?? [];
    list.push(table);
    byDay.set(key, list);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, dayTables], index) => ({
      key,
      date: dayTables[0].startDatetime,
      dayNumber: index + 1,
      tables: dayTables.sort(
        (a, b) => a.startDatetime.getTime() - b.startDatetime.getTime(),
      ),
    }));
}

/** « 14h30 » — format court français, sans espace. */
export function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** « 14h → 17h » */
export function formatSlot(start: Date, end: Date): string {
  return `${formatTime(start)} → ${formatTime(end)}`;
}

/** Formatteur partagé — construit une seule fois (Intl coûte cher à instancier). */
const dayTitleFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** « Vendredi 14 août » */
export function formatDayTitle(date: Date): string {
  const formatted = dayTitleFormatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export type SeatState = "open" | "last" | "full";

/** État du sceau de places : vert ≥ 2, or = 1 (dernière !), cramoisi = complet. */
export function seatState(
  table: Pick<RpgersTable, "placesLibresPubliques">,
): SeatState {
  if (table.placesLibresPubliques <= 0) return "full";
  if (table.placesLibresPubliques === 1) return "last";
  return "open";
}

/** Deux créneaux [start,end[ se chevauchent-ils ? */
export function slotsOverlap(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Tablées en conflit d'horaire avec la tablée cible (parmi les inscriptions). */
export function conflictingTables(
  target: RpgersTable,
  registered: RpgersTable[],
): RpgersTable[] {
  const t = { start: target.startDatetime, end: target.endDatetime };
  return registered.filter(
    (other) =>
      other.id !== target.id &&
      slotsOverlap(t, { start: other.startDatetime, end: other.endDatetime }),
  );
}
