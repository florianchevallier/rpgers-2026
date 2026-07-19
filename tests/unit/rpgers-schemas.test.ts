import { describe, expect, it } from "vitest";
import { rpgersDate, tableSchema } from "@/server/rpgers-schemas";
import fixture from "../../tests/fixtures/table.json";

describe("rpgersDate", () => {
  it("parse une date ISO classique", () => {
    expect(rpgersDate.parse("2026-08-14T12:00:00.000Z")).toEqual(
      new Date("2026-08-14T12:00:00.000Z"),
    );
  });

  it("parse une date RSC préfixée $D", () => {
    expect(rpgersDate.parse("$D2026-08-14T12:00:00.000Z")).toEqual(
      new Date("2026-08-14T12:00:00.000Z"),
    );
  });

  it("rejette une date invalide", () => {
    expect(() => rpgersDate.parse("hier soir")).toThrow();
  });
});

describe("tableSchema (fixture réelle du payload RSC officiel)", () => {
  it("valide une tablée réelle de l'API officielle", () => {
    const parsed = tableSchema.parse(fixture);
    expect(parsed.id).toBe(6038);
    expect(parsed.startDatetime).toBeInstanceOf(Date);
    expect(parsed.labels.length).toBeGreaterThan(0);
    expect(parsed.placesLibresPubliques).toBeTypeOf("number");
    expect(parsed.estComplete).toBeTypeOf("boolean");
  });

  it("rejette une tablée sans champ calculé requis", () => {
    const broken = { ...fixture } as Record<string, unknown>;
    delete broken.placesLibresTotal;
    expect(() => tableSchema.parse(broken)).toThrow();
  });
});
