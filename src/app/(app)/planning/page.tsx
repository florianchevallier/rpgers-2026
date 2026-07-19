import { CalendarCheck, Crown, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { SeatSeal } from "@/components/tables/seat-seal";
import { isMine } from "@/domain/filters";
import {
  formatDayTitle,
  formatSlot,
  groupTablesByDay,
  roman,
  slotsOverlap,
} from "@/domain/schedule";
import { requireSession } from "@/server/auth";
import { getTables } from "@/server/rpgers-client";

export const revalidate = 30;

export default async function PlanningPage() {
  const session = await requireSession();
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

  const days = groupTablesByDay(mine);
  // numérotation figée sur l'évènement complet
  const dayNumberByKey = new Map(
    groupTablesByDay(all).map((d) => [d.key, d.dayNumber]),
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-wide">
          Mes Parties
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ton planning de la convention — {mine.length} tablée
          {mine.length > 1 ? "s" : ""}.
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
            <strong>{conflictIds.size} tablées se chevauchent</strong> dans ton
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
              Explore les tablées
            </Link>{" "}
            et rejoins ta première partie !
          </p>
        </div>
      ) : (
        days.map((day) => (
          <section key={day.key} aria-labelledby={`planning-${day.key}`}>
            <h2 id={`planning-${day.key}`} className="day-heading">
              Jour {roman(dayNumberByKey.get(day.key) ?? day.dayNumber)} —{" "}
              {formatDayTitle(day.date)}
            </h2>
            <div className="mt-1 border-t border-primary/30" aria-hidden />
            <ol className="mt-4 flex flex-col gap-2.5">
              {day.tables.map((table) => {
                const conflict = conflictIds.has(table.id);
                const isOwner = table.ownerId === session.user.id;
                return (
                  <li key={table.id}>
                    <Link
                      href={`/tables/${table.id}`}
                      className={`flex items-center gap-4 rounded-xl border p-3.5 transition-colors ${
                        conflict
                          ? "border-destructive/60 bg-destructive/5"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <span className="w-24 shrink-0 text-sm font-semibold">
                        {formatSlot(table.startDatetime, table.endDatetime)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-heading font-semibold">
                            {table.titre}
                          </span>
                          {isOwner && (
                            <Crown
                              className="size-3.5 shrink-0 text-primary"
                              aria-label="Tu es le MJ"
                            />
                          )}
                          {conflict && (
                            <TriangleAlert
                              className="size-3.5 shrink-0 text-destructive"
                              aria-label="Conflit d'horaire"
                            />
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {table.salle.nom} · MJ {table.owner.pseudo}
                        </span>
                      </span>
                      <SeatSeal table={table} size="sm" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
