import { CalendarX } from "lucide-react";
import { after } from "next/server";
import { TablesExplorer } from "@/components/tables/tables-explorer";
import { toTableListItem } from "@/domain/table-list";
import { requirePageSession } from "@/server/auth";
import { listFavorites } from "@/server/favorites";
import { getLabelsCatalog } from "@/server/labels";
import { getTables, SchemaError } from "@/server/rpgers-client";
import type { RpgersTable } from "@/server/rpgers-schemas";
import { harvestUsers, resolvePseudos } from "@/server/user-directory";

export const revalidate = 30;

async function loadTables(jwt: string): Promise<{
  tables: RpgersTable[];
  error: string | null;
}> {
  try {
    return { tables: await getTables(jwt), error: null };
  } catch (error) {
    if (error instanceof SchemaError) {
      return {
        tables: [],
        error:
          "Le format de l’API officielle a changé. Préviens l’équipe technique.",
      };
    }
    return {
      tables: [],
      error:
        "Impossible de joindre le serveur officiel. Réessaie dans un instant.",
    };
  }
}

export default async function TablesPage() {
  const session = await requirePageSession();
  const [{ tables, error }, labelsCatalog, favorites] = await Promise.all([
    loadTables(session.jwt),
    getLabelsCatalog(),
    listFavorites(session.user.id),
  ]);

  // moisson opportuniste de l'annuaire (après la réponse, ne bloque pas le rendu)
  after(() => harvestUsers(tables.map((t) => t.owner)));

  // annuaire id→pseudo des inscrits : DB, complétée par les MJ de la liste
  // (résolution immédiate d'un MJ inscrit ailleurs) et nos favoris
  const pseudoById = await resolvePseudos(
    tables.flatMap((t) => t.registrations.map((r) => r.userId)),
  );
  for (const t of tables) {
    if (!pseudoById.has(t.owner.id)) pseudoById.set(t.owner.id, t.owner.pseudo);
  }
  for (const f of favorites) {
    if (!pseudoById.has(f.id)) pseudoById.set(f.id, f.pseudo);
  }

  if (error) {
    return (
      <div className="grid place-items-center py-20 text-center">
        <CalendarX className="size-10 text-muted-foreground" aria-hidden />
        <p className="mt-4 max-w-md text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <TablesExplorer
      tables={tables.map(toTableListItem)}
      labelsCatalog={labelsCatalog}
      currentUserId={session.user.id}
      favoriteIds={favorites.map((f) => f.id)}
      knownPlayers={[...pseudoById]}
    />
  );
}
