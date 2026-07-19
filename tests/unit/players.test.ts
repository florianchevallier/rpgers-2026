import { describe, expect, it } from "vitest";
import { buildPlayerChips, capPlayerChips } from "@/domain/players";

const reg = (userId: number, statut = "confirmed") => ({ userId, statut });

describe("buildPlayerChips", () => {
  it("ne garde que les inscriptions confirmées", () => {
    const chips = buildPlayerChips(
      [reg(1), reg(2, "waitlist"), reg(3, "canceled")],
      new Map([[1, "Ana"]]),
      new Set(),
    );
    expect(chips.map((c) => c.id)).toEqual([1]);
  });

  it("dédoublonne par userId", () => {
    const chips = buildPlayerChips(
      [reg(1), reg(1)],
      new Map([[1, "Ana"]]),
      new Set(),
    );
    expect(chips).toHaveLength(1);
  });

  it("résout les pseudos connus et laisse null les inconnus", () => {
    const chips = buildPlayerChips(
      [reg(1), reg(2)],
      new Map([[1, "Ana"]]),
      new Set(),
    );
    expect(chips.find((c) => c.id === 1)?.pseudo).toBe("Ana");
    expect(chips.find((c) => c.id === 2)?.pseudo).toBeNull();
  });

  it("trie : favoris d'abord, puis connus (alpha), puis inconnus", () => {
    const chips = buildPlayerChips(
      [reg(10), reg(20), reg(30), reg(40)],
      new Map([
        [20, "Zoé"],
        [30, "Ana"],
        [40, "Léo"],
      ]),
      new Set([40]),
    );
    expect(chips.map((c) => c.id)).toEqual([40, 30, 20, 10]);
  });

  it("marque les favoris même sans pseudo connu", () => {
    const chips = buildPlayerChips([reg(7)], new Map(), new Set([7]));
    expect(chips[0]).toEqual({ id: 7, pseudo: null, isFavorite: true });
  });
});

describe("capPlayerChips", () => {
  const chip = (id: number, pseudo: string | null, isFavorite = false) => ({
    id,
    pseudo,
    isFavorite,
  });

  it("ne montre que des chips nommées, le reste devient un compteur", () => {
    const { shown, hiddenCount } = capPlayerChips(
      [chip(1, "Ana"), chip(2, null), chip(3, "Léo")],
      5,
    );
    expect(shown.map((c) => c.id)).toEqual([1, 3]);
    expect(hiddenCount).toBe(1);
  });

  it("tronque au max et compte le dépassement", () => {
    const { shown, hiddenCount } = capPlayerChips(
      [chip(1, "Ana"), chip(2, "Bob"), chip(3, "Léo")],
      2,
    );
    expect(shown).toHaveLength(2);
    expect(hiddenCount).toBe(1);
  });

  it("liste vide → rien à montrer ni compter", () => {
    expect(capPlayerChips([], 4)).toEqual({ shown: [], hiddenCount: 0 });
  });
});
