import { notFound } from "next/navigation";
import { TablesExplorer } from "@/components/tables/tables-explorer";
import type { CatalogLabel } from "@/domain/labels";
import { type RpgersTable, tableSchema } from "@/server/rpgers-schemas";
import fixture from "../../../../tests/fixtures/table.json";
import labelsCatalog from "../../../server/labels-catalog.json";

/** Page de preview design — dev uniquement (validation visuelle sans compte). */
export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const base = tableSchema.parse(fixture);
  const tables: RpgersTable[] = [
    base,
    {
      ...base,
      id: 7001,
      titre: "La crypte de l'enchanteur",
      systemeJeu: "D&D 5e",
      placesLibresPubliques: 1,
      confirmed: 5,
      owner: { id: 2, pseudo: "Gandalf42" },
    },
    {
      ...base,
      id: 7002,
      titre: "Horreur à Arkham",
      systemeJeu: "L'appel de Cthulhu",
      placesLibresPubliques: 0,
      confirmed: 6,
      estComplete: true,
      owner: { id: 3, pseudo: "LovecraftFan" },
      startDatetime: new Date(base.startDatetime.getTime() + 4 * 3600_000),
      endDatetime: new Date(base.endDatetime.getTime() + 4 * 3600_000),
    },
    {
      ...base,
      id: 7003,
      titre: "Bataille royale des gobelins",
      systemeJeu: "Homebrew",
      placesLibresPubliques: 4,
      confirmed: 2,
      owner: { id: 4, pseudo: "GobelinKing" },
      startDatetime: new Date(base.startDatetime.getTime() + 86400_000),
      endDatetime: new Date(base.endDatetime.getTime() + 86400_000),
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <TablesExplorer
        tables={tables}
        labelsCatalog={labelsCatalog as CatalogLabel[]}
        currentUserId={17445}
        favoriteIds={[]}
        knownPlayers={[]}
      />
    </main>
  );
}
