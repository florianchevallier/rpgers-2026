import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { CatalogLabel } from "@/domain/labels";
import { labelSchema } from "@/server/rpgers-schemas";

/**
 * Catalogue des labels — snapshot extrait du payload officiel le 19 juil. 2026
 * (25 labels + matrice de conflits). Quasi-statique pendant l'évènement.
 * À terme : re-synchroniser si l'officiel expose un endpoint labels.
 */
const catalogSchema = z.array(
  labelSchema.extend({ conflictsWith: z.array(z.number()) }),
);

let cached: CatalogLabel[] | null = null;

export async function getLabelsCatalog(): Promise<CatalogLabel[]> {
  if (cached) return cached;
  const raw = await readFile(
    path.join(process.cwd(), "src/server/labels-catalog.json"),
    "utf-8",
  );
  cached = catalogSchema.parse(JSON.parse(raw)) as CatalogLabel[];
  return cached;
}
