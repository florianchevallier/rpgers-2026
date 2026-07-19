import { describe, expect, it } from "vitest";
import {
  conflictingTables,
  formatSlot,
  formatTime,
  groupTablesByDay,
  roman,
  seatState,
  slotsOverlap,
} from "@/domain/schedule";
import type { RpgersTable } from "@/server/rpgers-schemas";

const table = (id: number, start: string, end: string): RpgersTable =>
  ({
    id,
    startDatetime: new Date(start),
    endDatetime: new Date(end),
  }) as RpgersTable;

describe("roman", () => {
  it("convertit les jours de l'évènement", () => {
    expect(roman(1)).toBe("I");
    expect(roman(2)).toBe("II");
    expect(roman(3)).toBe("III");
  });
});

describe("dayKey / groupTablesByDay", () => {
  it("groupe par jour local et numérote Jour I, II…", () => {
    const groups = groupTablesByDay([
      table(2, "2026-08-15T10:00:00", "2026-08-15T12:00:00"),
      table(1, "2026-08-14T18:00:00", "2026-08-14T20:00:00"),
      table(3, "2026-08-14T09:00:00", "2026-08-14T12:00:00"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].dayNumber).toBe(1);
    expect(groups[1].dayNumber).toBe(2);
    // tri intra-jour chronologique : #3 (9h) avant #1 (18h)
    expect(groups[0].tables.map((t) => t.id)).toEqual([3, 1]);
  });
});

describe("formatTime / formatSlot", () => {
  it("formate à la française", () => {
    expect(formatTime(new Date("2026-08-14T14:00:00"))).toBe("14h");
    expect(formatTime(new Date("2026-08-14T14:30:00"))).toBe("14h30");
    expect(
      formatSlot(
        new Date("2026-08-14T14:00:00"),
        new Date("2026-08-14T17:30:00"),
      ),
    ).toBe("14h → 17h30");
  });
});

describe("seatState", () => {
  it("open ≥ 2, last = 1, adminOnly si seulement des places JDR, full sinon", () => {
    expect(seatState({ placesLibresPubliques: 3, placesLibresTotal: 5 })).toBe(
      "open",
    );
    expect(seatState({ placesLibresPubliques: 2, placesLibresTotal: 4 })).toBe(
      "open",
    );
    expect(seatState({ placesLibresPubliques: 1, placesLibresTotal: 3 })).toBe(
      "last",
    );
    expect(seatState({ placesLibresPubliques: 0, placesLibresTotal: 2 })).toBe(
      "adminOnly",
    );
    expect(seatState({ placesLibresPubliques: 0, placesLibresTotal: 0 })).toBe(
      "full",
    );
  });
});

describe("slotsOverlap / conflictingTables", () => {
  it("détecte le chevauchement stricte (bords exclus)", () => {
    const a = {
      start: new Date("2026-08-14T14:00:00"),
      end: new Date("2026-08-14T17:00:00"),
    };
    expect(
      slotsOverlap(a, {
        start: new Date("2026-08-14T16:00:00"),
        end: new Date("2026-08-14T18:00:00"),
      }),
    ).toBe(true);
    // enchaînement pile : pas un conflit
    expect(
      slotsOverlap(a, {
        start: new Date("2026-08-14T17:00:00"),
        end: new Date("2026-08-14T19:00:00"),
      }),
    ).toBe(false);
  });

  it("exclut la tablée elle-même des conflits", () => {
    const target = table(1, "2026-08-14T14:00:00", "2026-08-14T17:00:00");
    const registered = [
      table(1, "2026-08-14T14:00:00", "2026-08-14T17:00:00"), // soi-même
      table(2, "2026-08-14T15:00:00", "2026-08-14T16:00:00"), // conflit
      table(3, "2026-08-14T18:00:00", "2026-08-14T20:00:00"), // pas de conflit
    ];
    expect(conflictingTables(target, registered).map((t) => t.id)).toEqual([2]);
  });
});
