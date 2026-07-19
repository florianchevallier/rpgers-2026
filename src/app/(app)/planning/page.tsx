import { CalendarCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import {
  type PlanningDay,
  PlanningView,
} from "@/components/planning/planning-view";
import { isMine } from "@/domain/filters";
import {
  formatDayTitle,
  groupTablesByDay,
  slotsOverlap,
} from "@/domain/schedule";
import { requirePageSession } from "@/server/auth";
import { getTables } from "@/server/rpgers-client";

export const revalidate = 30;

const shortDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

export default async function PlanningPage() {
  const session = await requirePageSession();
  const all = await getTables(session.jwt);
  const mine = all
    .filter((t) => isMine(t, session.user.id))
    .sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());

  // paires en conflit d'horaire dans MON planning
  const conflictIds = new Set<number>();
  for (let i = 0; i < mine.length; i++) {
    for (let j = i + 1; j < mine.length; j++) {
      if (
        slotsOverlap(
          { start: mine[i].startDatetime, end: mine[i].endDatetime },
          { start: mine[j].startDatetime, end: mine[j].endDatetime },
        )
      ) {
        conflictIds.add(mine[i].id);
        conflictIds.add(mine[j].id);
      }
    }
  }

  // Les jours de navigation couvrent toute la convention, y compris ceux où
  // l'utilisateur n'a encore aucune partie.
  const eventDays = groupTablesByDay(all);
  const mineByDay = new Map(
    groupTablesByDay(mine).map((day) => [day.key, day]),
  );
  const days: PlanningDay[] = eventDays.map((eventDay) => ({
    key: eventDay.key,
    label: formatDayTitle(eventDay.date),
    shortLabel: shortDayFormatter.format(eventDay.date),
    dayNumber: String(eventDay.dayNumber),
    tables: (mineByDay.get(eventDay.key)?.tables ?? []).map((table) => ({
      id: table.id,
      title: table.titre,
      start: table.startDatetime.toISOString(),
      end: table.endDatetime.toISOString(),
      room: table.salle.nom,
      location: table.salle.lieu,
      gameMaster: table.owner.pseudo,
      isOwner: table.ownerId === session.user.id,
      hasConflict: conflictIds.has(table.id),
      seatsLeft: table.placesLibresPubliques,
    })),
  }));

  const todayKey = new Date().toLocaleDateString("sv-SE");
  const initialDayIndex = Math.max(
    0,
    days.findIndex((day) => day.key >= todayKey && day.tables.length > 0),
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Mon planning</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mine.length} partie{mine.length > 1 ? "s" : ""} prévue
          {mine.length > 1 ? "s" : ""} pendant la convention.
        </p>
      </header>

      {conflictIds.size > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm"
        >
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          <p>
            <strong>{conflictIds.size} parties se chevauchent</strong> dans ton
            planning — elles sont marquées en rouge ci-dessous.
          </p>
        </div>
      )}

      {mine.length === 0 ? (
        <div className="grid place-items-center py-16 text-center">
          <CalendarCheck
            className="size-10 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-3 max-w-sm text-muted-foreground">
            Rien de prévu pour l&apos;instant.{" "}
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              Parcourir les parties
            </Link>{" "}
            pour construire ton planning.
          </p>
        </div>
      ) : (
        <PlanningView days={days} initialDayIndex={initialDayIndex} />
      )}
    </div>
  );
}
