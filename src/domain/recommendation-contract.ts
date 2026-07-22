import { z } from "zod";

export const recommendationQuestionSchema = z.object({
  id: z.string().min(1).max(40),
  prompt: z.string().min(1).max(180),
  hint: z.string().max(240).optional(),
  multiple: z.boolean(),
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: z.string().min(1).max(100),
      }),
    )
    .min(2)
    .max(6),
});

export type RecommendationQuestion = z.infer<
  typeof recommendationQuestionSchema
>;

export const recommendationAnswerSchema = z.object({
  questionId: z.string().min(1).max(40),
  optionIds: z.array(z.string().min(1).max(40)).min(1).max(6),
});

export type RecommendationAnswer = z.infer<typeof recommendationAnswerSchema>;

export const recommendationRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("search"),
    query: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("question"),
    questions: z.array(recommendationQuestionSchema).max(3).default([]),
    answers: z.array(recommendationAnswerSchema).max(3).default([]),
  }),
  z.object({
    action: z.literal("recommend"),
    questions: z.array(recommendationQuestionSchema).min(1).max(6),
    answers: z.array(recommendationAnswerSchema).min(1).max(6),
    freeText: z.string().trim().max(500).optional(),
  }),
]);

export type RecommendedTableView = {
  id: number;
  title: string;
  system: string;
  description: string;
  start: string;
  end: string;
  room: string;
  location: string;
  gameMaster: string;
  labels: string[];
  seatsLeft: number;
  reason: string;
};

export type RecommendationSlotView = {
  slotId: number;
  selected: RecommendedTableView;
  alternatives: RecommendedTableView[];
};
