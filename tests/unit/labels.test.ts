import { describe, expect, it } from "vitest";
import {
  type CatalogLabel,
  disabledLabelIds,
  findLabelConflicts,
} from "@/domain/labels";

const catalog: CatalogLabel[] = [
  {
    id: 1,
    nom: "PEGI : Enfant",
    couleur: "#6366f1",
    isSystem: false,
    isAdult: false,
    conflictsWith: [14, 5],
  },
  {
    id: 5,
    nom: "Gore",
    couleur: "#e01b24",
    isSystem: false,
    isAdult: true,
    conflictsWith: [1],
  },
  {
    id: 10,
    nom: "Fantastique",
    couleur: "#f6d32d",
    isSystem: false,
    isAdult: false,
    conflictsWith: [],
  },
  {
    id: 14,
    nom: "Angoisse / Horreur",
    couleur: "#f6d32d",
    isSystem: false,
    isAdult: false,
    conflictsWith: [1],
  },
  {
    id: 22,
    nom: "Contemporain",
    couleur: "#f6d32d",
    isSystem: false,
    isAdult: false,
    conflictsWith: [9],
  },
  {
    id: 9,
    nom: "Médiéval",
    couleur: "#f6d32d",
    isSystem: false,
    isAdult: false,
    conflictsWith: [],
  }, // ne liste pas 22 !
];

describe("findLabelConflicts", () => {
  it("détecte un conflit direct (PEGI Enfant × Gore)", () => {
    expect(findLabelConflicts(catalog, [1, 5])).toEqual([
      { labelA: "PEGI : Enfant", labelB: "Gore" },
    ]);
  });

  it("détecte le conflit dans le sens inverse (matrice asymétrique)", () => {
    // 9 (Médiéval) ne liste pas 22, mais 22 liste 9
    expect(findLabelConflicts(catalog, [9, 22])).toEqual([
      { labelA: "Contemporain", labelB: "Médiéval" },
    ]);
  });

  it("pas de conflit → vide", () => {
    expect(findLabelConflicts(catalog, [10, 14])).toEqual([]);
  });

  it("déduplique les paires", () => {
    expect(findLabelConflicts(catalog, [1, 14])).toHaveLength(1);
  });
});

describe("disabledLabelIds", () => {
  it("désactive les labels en conflit avec la sélection", () => {
    const disabled = disabledLabelIds(catalog, [1]);
    expect(disabled.has(5)).toBe(true);
    expect(disabled.has(14)).toBe(true);
    expect(disabled.has(10)).toBe(false);
  });

  it("désactive dans le sens inverse aussi", () => {
    const disabled = disabledLabelIds(catalog, [9]);
    expect(disabled.has(22)).toBe(true);
  });
});
