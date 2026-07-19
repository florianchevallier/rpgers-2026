import { describe, expect, it } from "vitest";
import {
  cleanGameResearchSummary,
  deriveEditorialFacts,
  findUnannouncedTables,
  gameResearchKey,
  planSlackSync,
  selectBestGameSource,
} from "@/domain/slack-notifications";

describe("findUnannouncedTables", () => {
  it("retourne les tablées dont l'identifiant n'a jamais été annoncé", () => {
    const tables = [{ id: 10 }, { id: 11 }, { id: 12 }];

    expect(findUnannouncedTables(tables, new Set([10, 12]))).toEqual([
      { id: 11 },
    ]);
  });

  it("initialise silencieusement toutes les tablées au premier passage", () => {
    const tables = [{ id: 20 }, { id: 21 }];

    expect(planSlackSync(tables, new Set(), false)).toEqual({
      baseline: tables,
      notifications: [],
    });
  });

  it("annonce une création même si une ancienne tablée a disparu", () => {
    const currentTables = [{ id: 31 }, { id: 33 }];
    const previouslyAnnounced = new Set([31, 32]);

    expect(
      planSlackSync(currentTables, previouslyAnnounced, true).notifications,
    ).toEqual([{ id: 33 }]);
  });
});

describe("selectBestGameSource", () => {
  it("préfère une fiche GROG aux autres sources valides", () => {
    expect(
      selectBestGameSource([
        "https://fr.wikipedia.org/wiki/Donjons_et_Dragons",
        "https://www.legrog.org/jeux/donjons-et-dragons",
        "http://example.com/insecure",
      ]),
    ).toEqual({
      url: "https://www.legrog.org/jeux/donjons-et-dragons",
      name: "GROG",
    });
  });
});

describe("gameResearchKey", () => {
  it("ne recherche pas sur le web une création originale", () => {
    expect(gameResearchKey("Création originale du MJ")).toBeNull();
    expect(gameResearchKey("Homebrew avec cartes")).toBeNull();
    expect(gameResearchKey("  L'Appel de Cthulhu  ")).toBe(
      "l-appel-de-cthulhu",
    );
  });
});

describe("cleanGameResearchSummary", () => {
  it("rejette une recherche qui extrapole un jeu non identifié", () => {
    expect(
      cleanGameResearchSummary(
        "Il n’existe pas de jeu publié nommé Chaussettes ; il s’agit probablement d’un jeu maison.",
      ),
    ).toBeNull();
  });

  it("retire les marqueurs de citation Perplexity d'une présentation fiable", () => {
    expect(
      cleanGameResearchSummary(
        "Chorogaiden est un jeu d’horreur japonaise.[8] Son système utilise des d12.[3][10]",
      ),
    ).toBe(
      "Chorogaiden est un jeu d’horreur japonaise. Son système utilise des d12.",
    );
  });
});

describe("deriveEditorialFacts", () => {
  it("bloque déterministement la recommandation Milo pour un label adulte", () => {
    const facts = deriveEditorialFacts({
      maxPlayers: 5,
      placesLibresPubliques: 2,
      estPlacesAdminUniquement: false,
      labels: [{ nom: "Gore", isAdult: true }],
    });

    expect(facts).toMatchObject({
      seats: "2 places disponibles sur 5",
      audience: "Public adulte",
      contentWarnings: ["Gore"],
      milo: {
        verdict: "blocked",
        text: "❌ Trop mature — contenu adulte signalé : Gore.",
      },
    });
  });

  it("recommande déterministement une table enfant accueillant les débutants", () => {
    const facts = deriveEditorialFacts({
      maxPlayers: 4,
      placesLibresPubliques: 1,
      estPlacesAdminUniquement: false,
      labels: [
        { nom: "PEGI : Enfant", isAdult: false },
        { nom: "Débutants bienvenus", isAdult: false },
      ],
    });

    expect(facts).toMatchObject({
      seats: "1 place disponible sur 4",
      audience: "Public enfant",
      accessibility: "Débutants bienvenus",
      milo: {
        verdict: "recommended",
        text: "✅ OK pour Milo — table annoncée pour les enfants et les débutants.",
      },
    });
  });

  it("signale clairement quand seules les places administrateur restent", () => {
    const facts = deriveEditorialFacts({
      maxPlayers: 6,
      placesLibresPubliques: 0,
      estPlacesAdminUniquement: true,
      labels: [],
    });

    expect(facts.seats).toBe(
      "Complet côté public — places administrateur uniquement",
    );
  });
});
