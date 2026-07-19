import { describe, expect, it } from "vitest";
import {
  applyFilters,
  DEFAULT_FILTERS,
  type FilterContext,
  isMine,
} from "@/domain/filters";
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

const ctx = (overrides: Partial<FilterContext> = {}): FilterContext => ({
  now: NOW,
  currentUserId: 99,
  myTables: [],
  favoriteIds: new Set(),
  ...overrides,
});

describe("applyFilters", () => {
  it("masque les tablées passées par défaut", () => {
    const past = table(1, { endDatetime: new Date("2026-08-14T12:00:00") });
    const future = table(2);
    expect(applyFilters([past, future], DEFAULT_FILTERS, ctx())).toEqual([
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
        ctx(),
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
        ctx(),
      ),
    ).toEqual([both]);
  });

  it("exclut les tablées portant un label exclu", () => {
    const withLabel = table(1, {
      labels: [
        {
          tableId: 1,
          labelId: 10,
          label: {
            id: 10,
            nom: "Horreur",
            couleur: "#000",
            isSystem: false,
            isAdult: false,
          },
        },
      ],
    });
    const withoutLabel = table(2);
    expect(
      applyFilters(
        [withLabel, withoutLabel],
        { ...DEFAULT_FILTERS, excludedLabelIds: [10] },
        ctx(),
      ),
    ).toEqual([withoutLabel]);
  });

  it("exclut le MJ choisi", () => {
    const excluded = table(1, { owner: { id: 1, pseudo: "MJ1" } });
    const other = table(2, { owner: { id: 2, pseudo: "MJ2" } });
    expect(
      applyFilters(
        [excluded, other],
        { ...DEFAULT_FILTERS, excludedMj: "MJ1" },
        ctx(),
      ),
    ).toEqual([other]);
  });

  it("freeSeatsOnly exclut les complètes", () => {
    const full = table(1, { placesLibresPubliques: 0 });
    const open = table(2);
    expect(
      applyFilters(
        [full, open],
        { ...DEFAULT_FILTERS, freeSeatsOnly: true },
        ctx(),
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
        ctx({ currentUserId: 42 }),
      ),
    ).toEqual([mineAsOwner, mineAsPlayer]);
  });

  it("favoritesOnly : MJ ou joueur favori inscrit", () => {
    const favMj = table(1, { ownerId: 7, owner: { id: 7, pseudo: "MJ7" } });
    const favPlayer = table(2, {
      registrations: [{ userId: 8, statut: "confirmed" }],
    });
    const noFav = table(3);
    expect(
      applyFilters(
        [favMj, favPlayer, noFav],
        { ...DEFAULT_FILTERS, favoritesOnly: true },
        ctx({ favoriteIds: new Set([7, 8]) }),
      ),
    ).toEqual([favMj, favPlayer]);
  });

  it("hideConflicting : masque les tablées en chevauchement avec mon planning (hors les miennes)", () => {
    const mine = table(1, {
      ownerId: 42,
      startDatetime: new Date("2026-08-14T14:00:00"),
      endDatetime: new Date("2026-08-14T17:00:00"),
    });
    const overlapping = table(2, {
      startDatetime: new Date("2026-08-14T15:00:00"),
      endDatetime: new Date("2026-08-14T18:00:00"),
    });
    const free = table(3, {
      startDatetime: new Date("2026-08-14T18:00:00"),
      endDatetime: new Date("2026-08-14T20:00:00"),
    });
    expect(
      applyFilters(
        [mine, overlapping, free],
        { ...DEFAULT_FILTERS, hideConflicting: true },
        ctx({ currentUserId: 42, myTables: [mine] }),
      ),
    ).toEqual([mine, free]);
  });
});
