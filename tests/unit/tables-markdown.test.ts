import { describe, expect, it } from "vitest";
import { tablesToMarkdown } from "@/domain/tables-markdown";
import { tableSchema } from "@/server/rpgers-schemas";
import fixture from "../fixtures/table.json";

describe("tablesToMarkdown", () => {
  it("produit un document Markdown autonome avec les informations utiles au choix d'une partie", () => {
    const table = tableSchema.parse({
      ...fixture,
      titre: "L'Île aux [brumes]",
      description: "Une enquête en deux actes.\n\n# Ceci reste une description",
      systemeJeu: "Brindlewood Bay",
      salle: { nom: "Table 7", lieu: "Grande salle" },
      labels: [
        {
          tableId: fixture.id,
          labelId: 20,
          label: {
            id: 20,
            nom: "Débutants bienvenus",
            couleur: "#33d17a",
            isSystem: false,
            isAdult: false,
          },
        },
      ],
    });

    const markdown = tablesToMarkdown([table], {
      origin: "https://rpgers.example",
      generatedAt: new Date("2026-07-22T10:00:00.000Z"),
      pseudoById: new Map([
        [17388, "Ariane"],
        [17324, "Basile"],
      ]),
      participantPseudosByTableId: new Map([[6038, ["Céleste"]]]),
    });

    expect(markdown).toContain("# Parties RPGers 2026");
    expect(markdown).toContain("table_count: 1");
    expect(markdown).toContain(
      "## [L'Île aux \\[brumes\\]](https://rpgers.example/tables/6038)",
    );
    expect(markdown).toContain("- Système : Brindlewood Bay");
    expect(markdown).toContain("- Début : `2026-08-14T12:00:00.000Z`");
    expect(markdown).toContain(
      "- Horaire local : vendredi 14 août 2026, 14:00–15:00",
    );
    expect(markdown).toContain("- Lieu : Table 7 — Grande salle");
    expect(markdown).toContain("- MJ : Nours42");
    expect(markdown).toContain("- Places : 3 / 6 inscrites, 1 publique libre");
    expect(markdown).toContain("- Participants : Ariane, Basile, Céleste");
    expect(markdown).toContain("- Labels : Débutants bienvenus");
    expect(markdown).toContain(
      "> Une enquête en deux actes.\n>\n> # Ceci reste une description",
    );
  });

  it("ordonne les parties chronologiquement sans modifier la liste source", () => {
    const later = tableSchema.parse({
      ...fixture,
      id: 2,
      titre: "Partie du soir",
      startDatetime: "$D2026-08-14T18:00:00.000Z",
      endDatetime: "$D2026-08-14T20:00:00.000Z",
    });
    const earlier = tableSchema.parse({
      ...fixture,
      id: 1,
      titre: "Partie de l'après-midi",
      startDatetime: "$D2026-08-14T12:00:00.000Z",
      endDatetime: "$D2026-08-14T14:00:00.000Z",
    });
    const tables = [later, earlier];

    const markdown = tablesToMarkdown(tables, {
      origin: "https://rpgers.example",
    });

    expect(markdown.indexOf("Partie de l'après-midi")).toBeLessThan(
      markdown.indexOf("Partie du soir"),
    );
    expect(tables.map((table) => table.id)).toEqual([2, 1]);
  });
});
