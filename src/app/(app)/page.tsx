import { CalendarX } from "lucide-react";
import { TableCard } from "@/components/tables/table-card";
import { formatDayTitle, groupTablesByDay, roman } from "@/domain/schedule";
import { requireSession } from "@/server/auth";
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
  const { tables, error } = await loadTables();

  if (error) {
    return (
      <div className="grid place-items-center py-20 text-center">
        <CalendarX className="size-10 text-muted-foreground" aria-hidden />
        <p className="mt-4 max-w-md text-muted-foreground">{error}</p>
      </div>
    );
  }

  const days = groupTablesByDay(tables);

  return (
    <div className="flex flex-col gap-10">
      {days.map((day) => (
        <section key={day.key} aria-labelledby={`day-${day.key}`}>
          <h2 id={`day-${day.key}`} className="day-heading">
            Jour {roman(day.dayNumber)} — {formatDayTitle(day.date)}
          </h2>
          <div className="mt-1 border-t border-primary/30" aria-hidden />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {day.tables.map((table) => (
              <TableCard key={table.id} table={table} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
