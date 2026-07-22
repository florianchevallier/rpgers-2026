import { describe, expect, it } from "vitest";
import {
  buildRecommendationPlan,
  buildReplacementAlternatives,
  buildSpecificTableMatches,
  findPlanConflicts,
} from "@/domain/recommendations";
import { type RpgersTable, tableSchema } from "@/server/rpgers-schemas";
import fixture from "../fixtures/table.json";

function table(
  id: number,
  start: string,
  end: string,
  overrides: Partial<RpgersTable> = {},
): RpgersTable {
  return tableSchema.parse({
    ...fixture,
    id,
    titre: `Partie ${id}`,
    startDatetime: `$D${start}`,
    endDatetime: `$D${end}`,
    ...overrides,
  });
}

describe("buildRecommendationPlan", () => {
  it("construit un planning chronologique sans chevauchement et respecte le rythme choisi", () => {
    const tables = [
      table(1, "2026-08-14T08:00:00.000Z", "2026-08-14T10:00:00.000Z"),
      table(2, "2026-08-14T09:00:00.000Z", "2026-08-14T11:00:00.000Z"),
      table(3, "2026-08-14T12:00:00.000Z", "2026-08-14T14:00:00.000Z"),
      table(4, "2026-08-14T15:00:00.000Z", "2026-08-14T17:00:00.000Z"),
    ];

    const result = buildRecommendationPlan(
      tables,
      [
        { tableId: 1, score: 95, reason: "Très bon accord" },
        { tableId: 2, score: 80, reason: "Bon accord" },
        { tableId: 3, score: 90, reason: "Excellent complément" },
        { tableId: 4, score: 70, reason: "Autre possibilité" },
      ],
      { currentUserId: 99, isAdult: true, maxPerDay: 2 },
    );

    expect(result.slots.map(({ selected }) => selected.id)).toEqual([1, 3]);
    expect(result.slots).toHaveLength(2);
    expect(result.slots[0].selected.endDatetime.getTime()).toBeLessThanOrEqual(
      result.slots[1].selected.startDatetime.getTime(),
    );
  });

  it("écarte les parties inaccessibles et propose des remplacements similaires compatibles", () => {
    const fantasyLabel = {
      tableId: 1,
      labelId: 10,
      label: {
        id: 10,
        nom: "Fantastique",
        couleur: "#fff",
        isSystem: false,
        isAdult: false,
      },
    };
    const tables = [
      table(1, "2026-08-14T08:00:00.000Z", "2026-08-14T10:00:00.000Z", {
        systemeJeu: "Cairn",
        labels: [fantasyLabel],
      }),
      table(2, "2026-08-14T08:30:00.000Z", "2026-08-14T10:30:00.000Z", {
        systemeJeu: "Cairn",
        labels: [{ ...fantasyLabel, tableId: 2 }],
      }),
      table(3, "2026-08-14T12:00:00.000Z", "2026-08-14T14:00:00.000Z"),
      table(4, "2026-08-14T15:00:00.000Z", "2026-08-14T17:00:00.000Z", {
        labels: [
          {
            ...fantasyLabel,
            tableId: 4,
            label: { ...fantasyLabel.label, id: 99, isAdult: true },
          },
        ],
      }),
      table(5, "2026-08-14T18:00:00.000Z", "2026-08-14T20:00:00.000Z", {
        placesLibresPubliques: 0,
      }),
    ];

    const result = buildRecommendationPlan(
      tables,
      [
        { tableId: 1, score: 100, reason: "Premier choix" },
        { tableId: 2, score: 80, reason: "Très proche" },
        { tableId: 3, score: 90, reason: "Complément" },
        { tableId: 4, score: 100, reason: "Adulte" },
        { tableId: 5, score: 100, reason: "Complet" },
      ],
      { currentUserId: 99, isAdult: false, maxPerDay: 2 },
    );

    expect(result.slots.map(({ selected }) => selected.id)).toEqual([1, 3]);
    expect(
      result.slots[0].alternatives.map(
        ({ table: alternative }) => alternative.id,
      ),
    ).toContain(2);
    expect(
      result.slots.flatMap(({ alternatives }) => alternatives),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: expect.objectContaining({ id: 4 }) }),
        expect.objectContaining({ table: expect.objectContaining({ id: 5 }) }),
      ]),
    );
  });

  it("préserve au moins une heure pour déjeuner entre les parties", () => {
    const tables = [
      table(1, "2026-08-14T08:00:00.000Z", "2026-08-14T11:00:00.000Z"),
      table(2, "2026-08-14T11:00:00.000Z", "2026-08-14T16:00:00.000Z"),
      table(3, "2026-08-14T12:00:00.000Z", "2026-08-14T16:00:00.000Z"),
    ];

    const result = buildRecommendationPlan(
      tables,
      [
        { tableId: 1, score: 100, reason: "Matin" },
        { tableId: 2, score: 100, reason: "Sans pause" },
        { tableId: 3, score: 80, reason: "Avec déjeuner" },
      ],
      { currentUserId: 99, isAdult: true, maxPerDay: 2 },
    );

    expect(result.slots.map(({ selected }) => selected.id)).toEqual([1, 3]);
  });

  it("privilégie strictement la durée choisie lorsqu'elle est disponible", () => {
    const tables = [
      table(1, "2026-08-14T08:00:00.000Z", "2026-08-14T09:00:00.000Z"),
      table(2, "2026-08-14T09:00:00.000Z", "2026-08-14T10:00:00.000Z"),
      table(3, "2026-08-14T12:00:00.000Z", "2026-08-14T17:00:00.000Z"),
    ];

    const result = buildRecommendationPlan(
      tables,
      tables.map(({ id }) => ({
        tableId: id,
        score: id === 3 ? 60 : 100,
        reason: "Préférence",
      })),
      {
        currentUserId: 99,
        isAdult: true,
        maxPerDay: 3,
        preferredDuration: "long",
      },
    );

    expect(result.slots.map(({ selected }) => selected.id)).toEqual([3]);
  });

  it("ne programme pas deux sessions du même scénario", () => {
    const tables = [
      table(1, "2026-08-14T08:00:00.000Z", "2026-08-14T10:00:00.000Z", {
        titre: "Les Brumes d’Ys",
      }),
      table(2, "2026-08-14T12:00:00.000Z", "2026-08-14T14:00:00.000Z", {
        titre: "Les Brumes d'Ys",
      }),
      table(3, "2026-08-14T15:00:00.000Z", "2026-08-14T17:00:00.000Z", {
        titre: "Une autre aventure",
      }),
    ];

    const result = buildRecommendationPlan(
      tables,
      [
        { tableId: 1, score: 100, reason: "Session 1" },
        { tableId: 2, score: 99, reason: "Session 2" },
        { tableId: 3, score: 80, reason: "Distincte" },
      ],
      { currentUserId: 99, isAdult: true, maxPerDay: 3 },
    );

    expect(result.slots.map(({ selected }) => selected.id)).toEqual([1, 3]);
  });
});

describe("buildSpecificTableMatches", () => {
  it("classe les résultats ciblés sans imposer de compatibilité horaire", () => {
    const tables = [
      table(1, "2026-08-14T08:00:00.000Z", "2026-08-14T10:00:00.000Z"),
      table(2, "2026-08-14T08:30:00.000Z", "2026-08-14T10:30:00.000Z"),
      table(3, "2026-08-14T12:00:00.000Z", "2026-08-14T14:00:00.000Z", {
        statut: "closed",
      }),
    ];

    const result = buildSpecificTableMatches(
      tables,
      [
        { tableId: 1, score: 80, reason: "Proche" },
        { tableId: 2, score: 95, reason: "Exact" },
        { tableId: 3, score: 100, reason: "Fermée" },
      ],
      { currentUserId: 99, isAdult: true },
    );

    expect(result.map(({ table: match }) => match.id)).toEqual([2, 1]);
  });
});

describe("buildReplacementAlternatives", () => {
  it("propose à la demande des tables similaires sans conflit", () => {
    const current = table(
      1,
      "2026-08-14T08:00:00.000Z",
      "2026-08-14T10:00:00.000Z",
      { systemeJeu: "Cairn" },
    );
    const similar = table(
      2,
      "2026-08-14T08:30:00.000Z",
      "2026-08-14T10:30:00.000Z",
      { systemeJeu: "Cairn" },
    );
    const existing = table(
      3,
      "2026-08-14T12:00:00.000Z",
      "2026-08-14T14:00:00.000Z",
    );
    const overlapping = table(
      4,
      "2026-08-14T13:00:00.000Z",
      "2026-08-14T15:00:00.000Z",
      { systemeJeu: "Cairn" },
    );

    const result = buildReplacementAlternatives(
      [current, similar, existing, overlapping],
      current,
      [existing],
      { currentUserId: 99, isAdult: true },
    );

    expect(result.map(({ table: candidate }) => candidate.id)).toEqual([2]);
    expect(result[0].reason).toContain("Même système");
  });
});

describe("findPlanConflicts", () => {
  it("signale une autre session du même scénario", () => {
    const first = table(
      1,
      "2026-08-14T08:00:00.000Z",
      "2026-08-14T10:00:00.000Z",
      { titre: "La Nuit des Masques" },
    );
    const otherSession = table(
      2,
      "2026-08-15T12:00:00.000Z",
      "2026-08-15T14:00:00.000Z",
      { titre: "La nuit des masques" },
    );

    expect(findPlanConflicts([first], otherSession)).toContainEqual({
      type: "duplicate-scenario",
      tableIds: [1],
    });
  });
});
