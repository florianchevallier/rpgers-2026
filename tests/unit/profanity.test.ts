import { describe, expect, it } from "vitest";
import { findForbiddenWord, isClean } from "@/domain/profanity";

describe("filtre anti-injures (serveur)", () => {
  it("bloque les injures directes", () => {
    expect(isClean("Partie de connards")).toBe(false);
    expect(isClean("On va tous vous niquer bande de salopards")).toBe(false);
  });

  it("bloque le leet-speak", () => {
    expect(isClean("c0nn4rd")).toBe(false);
    expect(isClean("s@l0p3")).toBe(false);
  });

  it("bloque malgré les accents et la casse", () => {
    expect(isClean("ENCULÉ")).toBe(false);
  });

  it("accepte les mots innocents contenant des sous-chaînes proches", () => {
    expect(isClean("La réputation des héros")).toBe(true);
    expect(isClean("Computer & Cie")).toBe(true);
  });

  it("accepte les titres réels de tablées", () => {
    expect(isClean("Chaussettes")).toBe(true);
    expect(isClean("Présages RP - Session pirates")).toBe(true);
    expect(isClean("L'appel de Cthulhu : horreur à Arkham")).toBe(true);
  });

  it("renvoie le mot trouvé", () => {
    expect(findForbiddenWord("espèce de connard")).toBe("connard");
    expect(findForbiddenWord("titre impeccable")).toBeNull();
  });
});
