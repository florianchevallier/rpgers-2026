import { NewTableForm } from "@/components/tables/new-table-form";
import { groupTablesByDay } from "@/domain/schedule";
import { requireSession } from "@/server/auth";
import { getLabelsCatalog } from "@/server/labels";
import { getTables } from "@/server/rpgers-client";

export const revalidate = 300;

export default async function NewTablePage() {
  const session = await requireSession();
  const [labels, tables] = await Promise.all([
    getLabelsCatalog(),
    getTables(session.jwt),
  ]);

  // jours de la convention déduits des tablées existantes
  const days = groupTablesByDay(tables).map((d) => ({
    key: d.key,
    dayNumber: d.dayNumber,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-bold tracking-wide">
        Proposer une tablée
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu seras le·la MJ. Deux places sont toujours réservées à la tente JDR.
      </p>
      <NewTableForm
        labels={labels}
        days={days}
        isAdult={session.user.isAdult}
      />
    </div>
  );
}
