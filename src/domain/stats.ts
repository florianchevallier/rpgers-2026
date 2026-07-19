import { isMine } from "@/domain/filters";
import type { RpgersTable } from "@/server/rpgers-schemas";

/**
 * Stats joueur — logique PURE (testée), calculée uniquement à partir des
 * tablées déjà chargées (pas d'appel supplémentaire à l'API officielle).
 * Limitée à MES tablées : on n'a pas les pseudos des autres inscrits.
 */

export type LabelFrequency = { nom: string; couleur: string; count: number };

export type PlayerStats = {
  tablesAsPlayer: number;
  tablesAsGm: number;
  totalHours: number;
  topLabels: LabelFrequency[];
};

export function computePlayerStats(
  tables: RpgersTable[],
  userId: number,
): PlayerStats {
  const mine = tables.filter((t) => isMine(t, userId));
  const tablesAsGm = mine.filter((t) => t.ownerId === userId).length;
  const tablesAsPlayer = mine.length - tablesAsGm;

  const totalMs = mine.reduce(
    (sum, t) => sum + (t.endDatetime.getTime() - t.startDatetime.getTime()),
    0,
  );
  const totalHours = Math.round((totalMs / 3_600_000) * 10) / 10;

  const byLabel = new Map<number, LabelFrequency>();
  for (const table of mine) {
    for (const { label } of table.labels) {
      const entry = byLabel.get(label.id) ?? {
        nom: label.nom,
        couleur: label.couleur,
        count: 0,
      };
      entry.count += 1;
      byLabel.set(label.id, entry);
    }
  }
  const topLabels = [...byLabel.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { tablesAsPlayer, tablesAsGm, totalHours, topLabels };
}
