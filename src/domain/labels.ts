import type { Label } from "@/server/rpgers-schemas";

/**
 * Matrice de conflits de labels — logique PURE (testée).
 * 🔴 Validée côté serveur à la création (CLAUDE.md §5.3), pas seulement client.
 */

export type CatalogLabel = Label & { conflictsWith: number[] };

export type LabelConflict = { labelA: string; labelB: string };

/**
 * Conflits dans un ensemble de labels sélectionnés.
 * La matrice est symétrique dans les faits ; on la traite comme dirigée
 * (on vérifie A → B ET B → A) par sécurité.
 */
export function findLabelConflicts(
  catalog: CatalogLabel[],
  selectedIds: number[],
): LabelConflict[] {
  const selected = new Set(selectedIds);
  const byId = new Map(catalog.map((l) => [l.id, l]));
  const conflicts: LabelConflict[] = [];
  const seen = new Set<string>();

  for (const id of selectedIds) {
    const label = byId.get(id);
    if (!label) continue;
    for (const otherId of label.conflictsWith) {
      if (!selected.has(otherId)) continue;
      const key = [Math.min(id, otherId), Math.max(id, otherId)].join("-");
      if (seen.has(key)) continue;
      seen.add(key);
      const other = byId.get(otherId);
      if (other) conflicts.push({ labelA: label.nom, labelB: other.nom });
    }
  }
  return conflicts;
}

/** Labels désactivés dans le picker : ceux en conflit avec la sélection courante. */
export function disabledLabelIds(
  catalog: CatalogLabel[],
  selectedIds: number[],
): Set<number> {
  const selected = new Set(selectedIds);
  const byId = new Map(catalog.map((l) => [l.id, l]));
  const disabled = new Set<number>();

  for (const id of selectedIds) {
    const label = byId.get(id);
    if (!label) continue;
    for (const otherId of label.conflictsWith) {
      if (!selected.has(otherId)) disabled.add(otherId);
    }
  }
  // vérifie aussi le sens inverse (B liste A, mais A ne liste pas B)
  for (const label of catalog) {
    if (selected.has(label.id)) continue;
    if (label.conflictsWith.some((id) => selected.has(id)))
      disabled.add(label.id);
  }
  return disabled;
}
