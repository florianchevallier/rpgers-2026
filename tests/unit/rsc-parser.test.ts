import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveComputedFields, enrichRawTable } from "@/domain/derived-fields";
import type { RawRpgersTable } from "@/server/rpgers-schemas";
import {
  extractDetailPlayerPseudos,
  extractTableWrappers,
  extractUserSummaries,
} from "@/server/rsc-parser";

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

describe("extractUserSummaries", () => {
  it("moissonne les paires {id, pseudo} du snippet RSC réel", () => {
    const users = extractUserSummaries(snippet);
    expect(users.length).toBeGreaterThan(0);
    expect(
      users.every((u) => Number.isInteger(u.id) && u.pseudo.length > 0),
    ).toBe(true);
  });

  it("dédoublonne par id et décode les échappements", () => {
    const users = extractUserSummaries(
      '{"id":5,"pseudo":"Zo\\u00e9"} … {"id":5,"pseudo":"Zo\\u00e9"} {"id":6,"pseudo":"L\\"o"}',
    );
    expect(users).toEqual([
      { id: 5, pseudo: "Zoé" },
      { id: 6, pseudo: 'L"o' },
    ]);
  });

  it("texte sans utilisateur → []", () => {
    expect(extractUserSummaries("rien")).toEqual([]);
  });
});

describe("extractDetailPlayerPseudos (snippet RSC réel de la page détail)", () => {
  const detailSnippet = readFileSync(
    "tests/fixtures/rsc-detail-snippet.txt",
    "utf-8",
  );

  it("extrait les pseudos des inscrits, sans le ✓", () => {
    expect(extractDetailPlayerPseudos(detailSnippet)).toEqual([
      "PetitCastor",
      "10jonction",
    ]);
  });

  it("payload sans section Joueurs → []", () => {
    expect(extractDetailPlayerPseudos("autre chose")).toEqual([]);
    expect(extractDetailPlayerPseudos('"Joueurs (" mais pas de ul')).toEqual(
      [],
    );
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
