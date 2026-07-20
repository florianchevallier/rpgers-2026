import { NewTableForm } from "@/components/tables/new-table-form";
import { requirePageSession } from "@/server/auth";
import { getLabelsCatalog } from "@/server/labels";

export const revalidate = 300;

const shortDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  timeZone: "Europe/Paris",
});
const eventDayKeys = ["2026-08-14", "2026-08-15", "2026-08-16"] as const;

export default async function NewTablePage() {
  const session = await requirePageSession();
  const labels = await getLabelsCatalog();

  const days = eventDayKeys.map((key) => ({
    key,
    label: shortDayFormatter.format(new Date(`${key}T12:00:00+02:00`)),
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">
        Proposer une partie
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
