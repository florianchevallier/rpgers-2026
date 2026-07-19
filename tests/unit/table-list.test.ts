import { describe, expect, it } from "vitest";
import { toTableListItem } from "@/domain/table-list";
import { tableSchema } from "@/server/rpgers-schemas";
import fixture from "../fixtures/table.json";

describe("toTableListItem", () => {
  it("n'envoie que les données nécessaires à la home", () => {
    const compact = toTableListItem(tableSchema.parse(fixture));

    expect(compact.titre).toBe(fixture.titre);
    expect(compact.labels.length).toBeGreaterThan(0);
    expect(compact.registrations).toHaveLength(3);
    expect(compact).not.toHaveProperty("description");
    expect(compact).not.toHaveProperty("createdAt");
    expect(compact.salle).toEqual({ nom: fixture.salle.nom });
    expect(compact.labels[0]).toEqual({
      labelId: fixture.labels[0].labelId,
      label: {
        id: fixture.labels[0].label.id,
        nom: fixture.labels[0].label.nom,
        couleur: fixture.labels[0].label.couleur,
      },
    });
  });
});
