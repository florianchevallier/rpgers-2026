import { describe, expect, it } from "vitest";
import { computePlayerStats } from "@/domain/stats";
import type { RpgersTable } from "@/server/rpgers-schemas";

const label = (id: number, nom: string) => ({
  id,
  nom,
  couleur: "#f6d32d",
  isSystem: false,
  isAdult: false,
});

const table = (id: number, overrides: Partial<RpgersTable> = {}): RpgersTable =>
  ({
    id,
    ownerId: 1,
    owner: { id: 1, pseudo: "MJ1" },
    startDatetime: new Date("2026-08-14T14:00:00"),
    endDatetime: new Date("2026-08-14T17:00:00"),
    registrations: [],
    labels: [],
    ...overrides,
  }) as RpgersTable;

describe("computePlayerStats", () => {
  it("compte séparément MJ et joueur, ignore ce qui n'est pas mien", () => {
    const asGm = table(1, { ownerId: 42 });
    const asPlayer = table(2, {
      registrations: [{ userId: 42, statut: "confirmed" }],
    });
    const notMine = table(3);
    const stats = computePlayerStats([asGm, asPlayer, notMine], 42);
    expect(stats.tablesAsGm).toBe(1);
    expect(stats.tablesAsPlayer).toBe(1);
  });

  it("cumule les heures uniquement sur mes tablées", () => {
    const threeHours = table(1, {
      ownerId: 42,
      startDatetime: new Date("2026-08-14T14:00:00"),
      endDatetime: new Date("2026-08-14T17:00:00"),
    });
    const notMine = table(2, {
      startDatetime: new Date("2026-08-14T10:00:00"),
      endDatetime: new Date("2026-08-14T20:00:00"),
    });
    expect(computePlayerStats([threeHours, notMine], 42).totalHours).toBe(3);
  });

  it("classe les labels les plus fréquents parmi mes tablées", () => {
    const t1 = table(1, {
      ownerId: 42,
      labels: [
        { tableId: 1, labelId: 10, label: label(10, "Fantastique") },
        { tableId: 1, labelId: 21, label: label(21, "Humour") },
      ],
    });
    const t2 = table(2, {
      ownerId: 42,
      labels: [{ tableId: 2, labelId: 10, label: label(10, "Fantastique") }],
    });
    const stats = computePlayerStats([t1, t2], 42);
    expect(stats.topLabels[0]).toMatchObject({ nom: "Fantastique", count: 2 });
    expect(stats.topLabels[1]).toMatchObject({ nom: "Humour", count: 1 });
  });
});
