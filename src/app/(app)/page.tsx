import { CalendarX } from "lucide-react";
import { TablesExplorer } from "@/components/tables/tables-explorer";
import { requireSession } from "@/server/auth";
import { getLabelsCatalog } from "@/server/labels";
import { getTables, SchemaError } from "@/server/rpgers-client";
import type { RpgersTable } from "@/server/rpgers-schemas";

export const revalidate = 30;

async function loadTables(): Promise<{
  tables: RpgersTable[];
  error: string | null;
}> {
  const session = await requireSession();
  try {
    return { tables: await getTables(session.jwt), error: null };
  } catch (error) {
    if (error instanceof SchemaError) {
      return {
        tables: [],
        error:
          "L'API officielle a changé de format — le grimoire doit être mis à jour. Préviens l'orga du clone !",
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
  const [{ tables, error }, labelsCatalog, session] = await Promise.all([
    loadTables(),
    getLabelsCatalog(),
    requireSession(),
  ]);

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
      tables={tables}
      labelsCatalog={labelsCatalog}
      currentUserId={session.user.id}
    />
  );
}
