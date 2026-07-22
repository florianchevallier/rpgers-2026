import { describe, expect, it } from "vitest";
import { recommendationRequestSchema } from "@/domain/recommendation-contract";

const question = {
  id: "taste_3",
  prompt: "Une dernière préférence ?",
  multiple: false,
  options: [
    { id: "one", label: "Une" },
    { id: "two", label: "Deux" },
  ],
};

describe("recommendationRequestSchema", () => {
  it("accepte une recherche ciblée suffisamment précise", () => {
    expect(
      recommendationRequestSchema.safeParse({
        action: "search",
        query: "Une enquête horrifique légère",
      }).success,
    ).toBe(true);
  });

  it("refuse une recherche ciblée vide", () => {
    expect(
      recommendationRequestSchema.safeParse({
        action: "search",
        query: "  ",
      }).success,
    ).toBe(false);
  });

  it("accepte une préférence libre courte pour orienter le classement", () => {
    const result = recommendationRequestSchema.safeParse({
      action: "recommend",
      questions: [question],
      answers: [{ questionId: question.id, optionIds: ["one"] }],
      freeText: "  Beaucoup d’enquête, peu de combat.  ",
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.action === "recommend") {
      expect(result.data.freeText).toBe("Beaucoup d’enquête, peu de combat.");
    }
  });

  it("refuse une préférence libre démesurée", () => {
    const result = recommendationRequestSchema.safeParse({
      action: "recommend",
      questions: [question],
      answers: [{ questionId: question.id, optionIds: ["one"] }],
      freeText: "x".repeat(501),
    });

    expect(result.success).toBe(false);
  });
});
