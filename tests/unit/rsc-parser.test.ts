import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveComputedFields, enrichRawTable } from "@/domain/derived-fields";
import type { RawRpgersTable } from "@/server/rpgers-schemas";
import { extractTableWrappers } from "@/server/rsc-parser";

const snippet = readFileSync("tests/fixtures/rsc-snippet.txt", "utf-8");

describe("extractTableWrappers (snippet RSC réel)", () => {
  it("extrait le wrapper table avec isRegistered/currentUserId", () => {
    const wrappers = extractTableWrappers(snippet);
    expect(wrappers.length).toBeGreaterThan(0);
    const first = wrappers[0];
    expect(first.table.id).toBe(6038);
    expect(first.isRegistered).toBe(false);
    expect(first.currentUserId).toBe(17445);
  });

  it("ignore le JSON malformé sans planter", () => {
    expect(extractTableWrappers('"table":{broken,')).toEqual([]);
    expect(extractTableWrappers("rien du tout")).toEqual([]);
  });

  it("gère les accolades dans les chaînes", () => {
    const rsc =
      '{"table":{"id":1,"titre":"Partie {spéciale} \\"truc\\""},"isRegistered":true}';
    const wrappers = extractTableWrappers(rsc);
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0].table.titre).toBe('Partie {spéciale} "truc"');
    expect(wrappers[0].isRegistered).toBe(true);
  });
});

describe("deriveComputedFields", () => {
  const raw = (overrides: Partial<RawRpgersTable> = {}): RawRpgersTable =>
    ({
      maxPlayers: 6,
      adminPlaces: 2,
      reservedByAdmin: 0,
      _count: { registrations: 3 },
      ...overrides,
    }) as RawRpgersTable;

  it("reproduit les valeurs officielles (fixture #6038)", () => {
    expect(deriveComputedFields(raw())).toEqual({
      confirmed: 3,
      placesLibresTotal: 3,
      placesLibresPubliques: 1,
      estComplete: false,
      estPlacesAdminUniquement: false,
    });
  });

  it("estComplete quand plus aucune place", () => {
    const derived = deriveComputedFields(raw({ _count: { registrations: 6 } }));
    expect(derived.placesLibresTotal).toBe(0);
    expect(derived.estComplete).toBe(true);
  });

  it("estPlacesAdminUniquement quand il ne reste que des places admin", () => {
    const derived = deriveComputedFields(raw({ _count: { registrations: 5 } }));
    expect(derived.placesLibresPubliques).toBe(0);
    expect(derived.placesLibresTotal).toBe(1);
    expect(derived.estPlacesAdminUniquement).toBe(true);
    expect(derived.estComplete).toBe(false);
  });

  it("clamp à zéro (sursouscription)", () => {
    const derived = deriveComputedFields(
      raw({ _count: { registrations: 10 } }),
    );
    expect(derived.placesLibresTotal).toBe(0);
    expect(derived.placesLibresPubliques).toBe(0);
  });
});

describe("enrichRawTable", () => {
  it("ajoute registrations vide et les champs calculés", () => {
    const enriched = enrichRawTable({
      maxPlayers: 5,
      adminPlaces: 2,
      reservedByAdmin: 1,
      _count: { registrations: 1 },
    } as RawRpgersTable);
    expect(enriched.registrations).toEqual([]);
    expect(enriched.placesLibresPubliques).toBe(1);
  });
});
