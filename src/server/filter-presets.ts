import type { FilterParams } from "@/lib/filter-params";
import { db } from "@/server/db";

export type FilterPreset = {
  id: number;
  name: string;
  params: FilterParams;
};

export async function listFilterPresets(
  userId: number,
): Promise<FilterPreset[]> {
  const rows = await db.filterPreset.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    params: JSON.parse(r.params) as FilterParams,
  }));
}

export async function saveFilterPreset(
  userId: number,
  name: string,
  params: FilterParams,
): Promise<void> {
  const json = JSON.stringify(params);
  await db.filterPreset.upsert({
    where: { userId_name: { userId, name } },
    create: { userId, name, params: json },
    update: { params: json },
  });
}

export async function deleteFilterPreset(
  userId: number,
  id: number,
): Promise<void> {
  // deleteMany (pas delete) : {id, userId} n'est pas une clé unique Prisma —
  // on veut aussi vérifier la propriété avant suppression.
  await db.filterPreset.deleteMany({ where: { id, userId } });
}
