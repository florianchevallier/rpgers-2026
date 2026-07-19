import {
  CalendarClock,
  MapPin,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegisterButton } from "@/components/tables/register-button";
import { SeatSeal } from "@/components/tables/seat-seal";
import { isMine } from "@/domain/filters";
import {
  conflictingTables,
  formatDayTitle,
  formatSlot,
} from "@/domain/schedule";
import { requireSession } from "@/server/auth";
import { ApiError, getTable, getTables } from "@/server/rpgers-client";
import type { RpgersTable } from "@/server/rpgers-schemas";

export const revalidate = 30;

type Props = { params: Promise<{ id: string }> };

async function loadTable(
  id: number,
): Promise<{ table: RpgersTable; all: RpgersTable[] } | null> {
  const session = await requireSession();
  const all = await getTables(session.jwt);
  try {
    // endpoint détail si disponible (données potentiellement plus riches)
    const table = await getTable(session.jwt, id);
    return { table, all };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const table = all.find((t) => t.id === id);
      return table ? { table, all } : null;
    }
    const table = all.find((t) => t.id === id);
    if (!table) throw error;
    return { table, all };
  }
}

export default async function TableDetailPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [data, session] = await Promise.all([loadTable(id), requireSession()]);
  if (!data) notFound();

  const { table, all } = data;
  const mine = isMine(table, session.user.id);
  const isOwner = table.ownerId === session.user.id;
  const registered = all.filter((t) => isMine(t, session.user.id));
  const conflicts = mine ? [] : conflictingTables(table, registered);
  const now = new Date();
  const startsInMs = table.startDatetime.getTime() - now.getTime();
  const unregisterLocked =
    mine && !isOwner && startsInMs < 3600_000 && startsInMs > 0;

  return (
    <article className="mx-auto max-w-2xl">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Retour aux tablées
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <CalendarClock className="size-4" aria-hidden />
              {formatDayTitle(table.startDatetime)} ·{" "}
              {formatSlot(table.startDatetime, table.endDatetime)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden />
              {table.salle.nom} — {table.salle.lieu}
            </span>
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-wide">
            {table.titre}
          </h1>
          <p className="mt-1 text-lg italic text-muted-foreground">
            {table.systemeJeu}
          </p>
        </div>
        <SeatSeal table={table} />
      </div>

      {conflicts.length > 0 && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm"
        >
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          <p>
            <strong>Conflit d&apos;horaire</strong> avec{" "}
            {conflicts.map((c) => `« ${c.titre} »`).join(", ")} — tu es déjà
            inscrit·e sur ce créneau.
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-1.5">
        {table.labels.map(({ label }) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs"
          >
            <span
              className="size-2 rounded-full ring-1 ring-black/20"
              style={{ backgroundColor: label.couleur }}
              aria-hidden
            />
            {label.nom}
          </span>
        ))}
      </div>

      <div className="mt-6 whitespace-pre-wrap rounded-xl border border-border bg-card p-5 leading-relaxed">
        {table.description}
      </div>

      <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <User className="size-4" aria-hidden />
          MJ : <strong className="text-foreground">{table.owner.pseudo}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" aria-hidden />
          {table.confirmed} inscrit·e·s · {table.placesLibresPubliques} places
          publiques libres
        </span>
      </div>

      {!isOwner && (
        <div className="mt-8">
          <RegisterButton
            tableId={table.id}
            isRegistered={mine}
            isFull={table.placesLibresPubliques <= 0}
            unregisterLocked={unregisterLocked}
            hasConflict={conflicts.length > 0}
          />
          {unregisterLocked && (
            <p className="mt-2 text-xs text-muted-foreground">
              Désinscription verrouillée : la partie commence dans moins
              d&apos;une heure (règle officielle).
            </p>
          )}
        </div>
      )}
      {isOwner && (
        <p className="mt-8 text-sm text-muted-foreground">
          Tu es le·la MJ de cette tablée.
        </p>
      )}
    </article>
  );
}
