import { describe, expect, it } from "vitest";
import { applyFilters, DEFAULT_FILTERS, isMine } from "@/domain/filters";
import type { RpgersTable } from "@/server/rpgers-schemas";

const NOW = new Date("2026-08-14T15:00:00");

const table = (id: number, overrides: Partial<RpgersTable> = {}): RpgersTable =>
  ({
    id,
    ownerId: 1,
    owner: { id: 1, pseudo: "MJ1" },
    startDatetime: new Date("2026-08-14T14:00:00"),
    endDatetime: new Date("2026-08-14T17:00:00"),
    placesLibresPubliques: 2,
    registrations: [],
    labels: [],
    ...overrides,
  }) as RpgersTable;

describe("applyFilters", () => {
  it("masque les tablées passées par défaut", () => {
    const past = table(1, { endDatetime: new Date("2026-08-14T12:00:00") });
    const future = table(2);
    expect(applyFilters([past, future], DEFAULT_FILTERS, NOW, 99)).toEqual([
      future,
    ]);
  });

  it("filtre par jour", () => {
    const otherDay = table(1, {
      startDatetime: new Date("2026-08-15T14:00:00"),
      endDatetime: new Date("2026-08-15T17:00:00"),
    });
    const sameDay = table(2);
    expect(
      applyFilters(
        [otherDay, sameDay],
        { ...DEFAULT_FILTERS, day: "2026-08-14" },
        NOW,
        99,
      ),
    ).toEqual([sameDay]);
  });

  it("logique ET sur les labels", () => {
    const both = table(1, {
      labels: [
        {
          tableId: 1,
          labelId: 10,
          label: {
            id: 10,
            nom: "Fantastique",
            couleur: "#f6d32d",
            isSystem: false,
            isAdult: false,
          },
        },
        {
          tableId: 1,
          labelId: 21,
          label: {
            id: 21,
            nom: "Humour",
            couleur: "#f6d32d",
            isSystem: false,
            isAdult: false,
          },
        },
      ],
    });
    const onlyOne = table(2, {
      labels: [
        {
          tableId: 2,
          labelId: 10,
          label: {
            id: 10,
            nom: "Fantastique",
            couleur: "#f6d32d",
            isSystem: false,
            isAdult: false,
          },
        },
      ],
    });
    expect(
      applyFilters(
        [both, onlyOne],
        { ...DEFAULT_FILTERS, labelIds: [10, 21] },
        NOW,
        99,
      ),
    ).toEqual([both]);
  });

  it("freeSeatsOnly exclut les complètes", () => {
    const full = table(1, { placesLibresPubliques: 0 });
    const open = table(2);
    expect(
      applyFilters(
        [full, open],
        { ...DEFAULT_FILTERS, freeSeatsOnly: true },
        NOW,
        99,
      ),
    ).toEqual([open]);
  });

  it("mineOnly : MJ ou inscrit", () => {
    const mineAsOwner = table(1, { ownerId: 42 });
    const mineAsPlayer = table(2, {
      registrations: [{ userId: 42, statut: "confirmed" }],
    });
    const notMine = table(3);
    expect(isMine(mineAsOwner, 42)).toBe(true);
    expect(isMine(mineAsPlayer, 42)).toBe(true);
    expect(isMine(notMine, 42)).toBe(false);
    expect(
      applyFilters(
        [mineAsOwner, mineAsPlayer, notMine],
        { ...DEFAULT_FILTERS, mineOnly: true },
        NOW,
        42,
      ),
    ).toEqual([mineAsOwner, mineAsPlayer]);
  });
});
