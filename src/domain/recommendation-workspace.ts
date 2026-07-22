import { z } from "zod";

const savedChoiceSchema = z.object({
  tableId: z.number().int().positive(),
  reason: z.string().max(500),
});

export const savedPlanSchema = z.object({
  profileSummary: z.string().max(1000),
  usedLlm: z.boolean(),
  slots: z.array(
    z.object({
      selected: savedChoiceSchema,
      alternatives: z.array(savedChoiceSchema).max(10),
    }),
  ),
});

export type SavedPlan = z.infer<typeof savedPlanSchema>;

export const savedSearchSchema = z.object({
  query: z.string().min(3).max(500),
  profileSummary: z.string().max(1000),
  usedLlm: z.boolean(),
  matches: z.array(savedChoiceSchema).max(30),
});

export type SavedSearch = z.infer<typeof savedSearchSchema>;

export const workspaceMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("clear-plan") }),
  z.object({ action: z.literal("clear-search") }),
  z.object({
    action: z.literal("add"),
    tableId: z.number().int().positive(),
    replaceTableId: z.number().int().positive().optional(),
  }),
  z.object({
    action: z.literal("replace"),
    tableId: z.number().int().positive(),
    replacementId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("remove"),
    tableId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("alternatives"),
    tableId: z.number().int().positive(),
  }),
]);
