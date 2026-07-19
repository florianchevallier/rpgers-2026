import {
  CalendarClock,
  MapPin,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BackToListLink } from "@/components/tables/back-to-list-link";
import { FavoriteToggle } from "@/components/tables/favorite-toggle";
import { LabelChip } from "@/components/tables/label-badge";
import { PlayerBadge } from "@/components/tables/players-strip";
import { RegisterButton } from "@/components/tables/register-button";
import { SeatSeal } from "@/components/tables/seat-seal";
import { isMine } from "@/domain/filters";
import { buildPlayerChips } from "@/domain/players";
import {
  conflictingTables,
  formatDayTitle,
  formatSlot,
} from "@/domain/schedule";
import { requirePageSession } from "@/server/auth";
import { listFavorites } from "@/server/favorites";
import { getTableDetailPseudos, getTables } from "@/server/rpgers-client";
import type { RpgersTable } from "@/server/rpgers-schemas";
import {
  harvestUsers,
  resolvePseudos,
  resolveUsersByPseudos,
} from "@/server/user-directory";

export const revalidate = 30;

type Props = { params: Promise<{ id: string }> };

async function loadTable(
  id: number,
  jwt: string,
): Promise<{ table: RpgersTable; all: RpgersTable[] } | null> {
  const all = await getTables(jwt);
  const table = all.find((t) => t.id === id);
  return table ? { table, all } : null;
}

export default async function TableDetailPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const session = await requirePageSession();
  const [data, favorites, detailPseudos] = await Promise.all([
    loadTable(id, session.jwt),
    listFavorites(session.user.id),
    // pseudos des inscrits : rendus en JSX pur (sans userId) sur la page
    // détail officielle — extraction best-effort
    getTableDetailPseudos(session.jwt, id),
  ]);
  if (!data) notFound();

  const { table, all } = data;

  // appariement pseudo→id (annuaire, puis recherche officielle pour les
  // manquants — coût unique par joueur, moissonné ensuite)
  const detailUsers = await resolveUsersByPseudos(session.jwt, detailPseudos);
  after(() => harvestUsers([table.owner]));

  const pseudoById = await resolvePseudos(
    table.registrations.map((r) => r.userId),
  );
  for (const u of detailUsers) pseudoById.set(u.id, u.pseudo);
  if (!pseudoById.has(table.owner.id))
    pseudoById.set(table.owner.id, table.owner.pseudo);
  for (const f of favorites) {
    if (!pseudoById.has(f.id)) pseudoById.set(f.id, f.pseudo);
  }
  const favoriteIds = new Set(favorites.map((f) => f.id));
  const players = buildPlayerChips(
    table.registrations,
    pseudoById,
    favoriteIds,
  );
  const unknownCount = players.filter((p) => p.pseudo === null).length;
  // pseudos affichés par l'officiel mais non appariés à un userId : on les
  // montre quand même (sans toggle favori) à la place du compteur
  const matchedPseudos = new Set(
    players.map((p) => p.pseudo).filter((p): p is string => p !== null),
  );
  const unmatchedPseudos = detailPseudos.filter((p) => !matchedPseudos.has(p));
  const stillUnknownCount = Math.max(0, unknownCount - unmatchedPseudos.length);
  const mine = isMine(table, session.user.id);
  const isOwner = table.ownerId === session.user.id;
  const registered = all.filter((t) => isMine(t, session.user.id));
  const conflicts = mine ? [] : conflictingTables(table, registered);
  const now = new Date();
  const startsInMs = table.startDatetime.getTime() - now.getTime();
  const unregisterLocked =
    mine && !isOwner && startsInMs < 3600_000 && startsInMs > 0;

  return (
    <article className="mx-auto max-w-3xl">
      <BackToListLink />

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
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
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {table.titre}
          </h1>
          <p className="mt-1 text-base font-medium text-muted-foreground sm:text-lg">
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
          <LabelChip
            key={label.id}
            nom={label.nom}
            couleur={label.couleur}
            className="py-1 text-xs"
          />
        ))}
      </div>

      <section className="mt-7" aria-labelledby="description-heading">
        <h2 id="description-heading" className="text-base font-semibold">
          Description
        </h2>
        <div className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-card p-5 leading-relaxed text-foreground/90">
          {table.description}
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-6">
        <span className="inline-flex items-center gap-1.5">
          <User className="size-4" aria-hidden />
          MJ : <strong className="text-foreground">{table.owner.pseudo}</strong>
          {!isOwner && (
            <FavoriteToggle
              userId={table.ownerId}
              pseudo={table.owner.pseudo}
              initialFavorite={favoriteIds.has(table.ownerId)}
            />
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" aria-hidden />
          {table.confirmed} inscrit·e{table.confirmed > 1 ? "·s" : ""} ·{" "}
          {table.placesLibresPubliques} place
          {table.placesLibresPubliques > 1 ? "s" : ""} publique
          {table.placesLibresPubliques > 1 ? "s" : ""} libre
          {table.placesLibresPubliques > 1 ? "s" : ""}
        </span>
      </div>

      {players.length > 0 && (
        <section aria-label="Autour de la table" className="mt-4">
          <h2 className="text-sm font-semibold">Participants</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1.5">
            {players
              .filter((p) => p.pseudo !== null)
              .map((player) => (
                <span key={player.id} className="inline-flex items-center">
                  <PlayerBadge player={player} className="py-1 text-xs" />
                  {player.pseudo !== null && player.id !== session.user.id && (
                    <FavoriteToggle
                      userId={player.id}
                      pseudo={player.pseudo}
                      initialFavorite={player.isFavorite}
                    />
                  )}
                </span>
              ))}
            {unmatchedPseudos.map((pseudo) => (
              <PlayerBadge
                key={pseudo}
                player={{ id: 0, pseudo, isFavorite: false }}
                className="py-1 text-xs"
              />
            ))}
            {stillUnknownCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {stillUnknownCount === players.length
                  ? `${stillUnknownCount} participant·e·s sans pseudo disponible`
                  : `+${stillUnknownCount} au pseudo inconnu`}
              </span>
            )}
          </div>
        </section>
      )}

      {!isOwner && (
        <div className="mt-8">
          <RegisterButton
            key={mine ? "registered" : "available"}
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
          Tu es le ou la MJ de cette partie.
        </p>
      )}
    </article>
  );
}
