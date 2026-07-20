import {
  CalendarClock,
  MapPin,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense, ViewTransition } from "react";
import { BackToListLink } from "@/components/tables/back-to-list-link";
import { FavoriteToggle } from "@/components/tables/favorite-toggle";
import { LabelChip } from "@/components/tables/label-badge";
import { PlayerBadge } from "@/components/tables/players-strip";
import { RegisterButton } from "@/components/tables/register-button";
import { SeatSeal } from "@/components/tables/seat-seal";
import { Skeleton } from "@/components/ui/skeleton";
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
type Favorite = Awaited<ReturnType<typeof listFavorites>>[number];

async function loadTable(
  id: number,
  jwt: string,
): Promise<{ table: RpgersTable; all: RpgersTable[] } | null> {
  const all = await getTables(jwt);
  const table = all.find((candidate) => candidate.id === id);
  return table ? { table, all } : null;
}

export default async function TableDetailPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const session = await requirePageSession();
  const [data, favorites] = await Promise.all([
    loadTable(id, session.jwt),
    listFavorites(session.user.id),
  ]);
  if (!data) notFound();

  const { table, all } = data;
  after(() => harvestUsers([table.owner]));

  const favoriteIds = new Set(favorites.map((favorite) => favorite.id));
  const mine = isMine(table, session.user.id);
  const isOwner = table.ownerId === session.user.id;
  const registered = all.filter((candidate) =>
    isMine(candidate, session.user.id),
  );
  const conflicts = mine ? [] : conflictingTables(table, registered);
  const startsInMs = table.startDatetime.getTime() - Date.now();
  const unregisterLocked =
    mine && !isOwner && startsInMs < 3_600_000 && startsInMs > 0;

  return (
    <article className={`mx-auto max-w-5xl ${isOwner ? "" : "pb-24 sm:pb-0"}`}>
      <div className="mb-4 hidden sm:block">
        <BackToListLink />
      </div>

      <header className="-mx-4 -mt-4 border-b border-border/70 bg-card px-4 pb-6 pt-5 sm:mx-0 sm:mt-0 sm:rounded-2xl sm:border sm:p-7 sm:shadow-xs lg:p-8">
        <div className="flex items-start justify-between gap-5 sm:items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary sm:whitespace-nowrap">
              <CalendarClock className="size-4" aria-hidden />
              {formatDayTitle(table.startDatetime)} ·{" "}
              {formatSlot(table.startDatetime, table.endDatetime)}
            </p>
            <ViewTransition
              name={`table-title-${table.id}`}
              share="table-title-morph"
            >
              <h1 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-tight sm:text-4xl lg:max-w-3xl lg:text-[2.75rem]">
                {table.titre}
              </h1>
            </ViewTransition>
            <p className="mt-2 text-base font-medium text-muted-foreground sm:text-lg">
              {table.systemeJeu}
            </p>
          </div>
          <SeatSeal table={table} />
        </div>

        {table.labels.length > 0 && (
          <div className="horizontal-scroll -mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {table.labels.map(({ label }) => (
              <LabelChip
                key={label.id}
                nom={label.nom}
                couleur={label.couleur}
                className="shrink-0 py-1 text-xs"
              />
            ))}
          </div>
        )}
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          {conflicts.length > 0 && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/8 p-4 text-sm"
            >
              <TriangleAlert
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden
              />
              <p>
                <strong>Conflit d&apos;horaire.</strong> Tu es déjà inscrit·e à{" "}
                {conflicts
                  .map((conflict) => `« ${conflict.titre} »`)
                  .join(", ")}
                .
              </p>
            </div>
          )}

          <section
            className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6"
            aria-labelledby="description-heading"
          >
            <h2 id="description-heading" className="text-base font-semibold">
              À propos de la partie
            </h2>
            <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-foreground/85 sm:text-base">
              {table.description}
            </div>
          </section>

          <Suspense fallback={<ParticipantsSkeleton />}>
            <ParticipantsSection
              table={table}
              jwt={session.jwt}
              favorites={favorites}
              currentUserId={session.user.id}
            />
          </Suspense>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold">Informations</h2>
            <dl className="mt-4 divide-y divide-border/70">
              <InfoRow icon={CalendarClock} label="Horaire">
                <span className="capitalize">
                  {formatDayTitle(table.startDatetime)}
                </span>
                <span>
                  {formatSlot(table.startDatetime, table.endDatetime)}
                </span>
              </InfoRow>
              <InfoRow icon={MapPin} label="Lieu">
                <span>{table.salle.nom}</span>
                <span>{table.salle.lieu}</span>
              </InfoRow>
              <InfoRow icon={User} label="MJ">
                <span className="flex items-center gap-1">
                  {table.owner.pseudo}
                  {!isOwner && (
                    <FavoriteToggle
                      userId={table.ownerId}
                      pseudo={table.owner.pseudo}
                      initialFavorite={favoriteIds.has(table.ownerId)}
                    />
                  )}
                </span>
              </InfoRow>
              <InfoRow icon={Users} label="Participants">
                <span>
                  {table.confirmed} sur {table.maxPlayers}
                </span>
                <span>
                  {table.placesLibresPubliques > 0
                    ? `${table.placesLibresPubliques} place${table.placesLibresPubliques > 1 ? "s" : ""} publique${table.placesLibresPubliques > 1 ? "s" : ""}`
                    : "Aucune place publique"}
                </span>
              </InfoRow>
            </dl>
          </section>

          {isOwner ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm">
              <strong>Tu es MJ de cette partie.</strong>
              <p className="mt-1 text-muted-foreground">
                Ta place est automatiquement réservée.
              </p>
            </div>
          ) : (
            <section className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border/70 bg-background/95 px-4 py-3 shadow-[0_-8px_30px_-18px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:static sm:rounded-2xl sm:border sm:bg-card sm:p-5 sm:shadow-xs">
              <p className="mb-3 hidden text-sm font-semibold sm:block">
                {mine ? "Ta place est réservée" : "Rejoindre la partie"}
              </p>
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
                  Désinscription verrouillée moins d&apos;une heure avant le
                  début.
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

async function ParticipantsSection({
  table,
  jwt,
  favorites,
  currentUserId,
}: {
  table: RpgersTable;
  jwt: string;
  favorites: Favorite[];
  currentUserId: number;
}) {
  const [detailPseudos, pseudoById] = await Promise.all([
    getTableDetailPseudos(jwt, table.id),
    resolvePseudos(
      table.registrations.map((registration) => registration.userId),
    ),
  ]);
  const detailUsers = await resolveUsersByPseudos(jwt, detailPseudos);

  for (const user of detailUsers) pseudoById.set(user.id, user.pseudo);
  if (!pseudoById.has(table.owner.id)) {
    pseudoById.set(table.owner.id, table.owner.pseudo);
  }
  for (const favorite of favorites) {
    if (!pseudoById.has(favorite.id)) {
      pseudoById.set(favorite.id, favorite.pseudo);
    }
  }

  const favoriteIds = new Set(favorites.map((favorite) => favorite.id));
  const players = buildPlayerChips(
    table.registrations,
    pseudoById,
    favoriteIds,
  );
  const unknownCount = players.filter(
    (player) => player.pseudo === null,
  ).length;
  const matchedPseudos = new Set(
    players
      .map((player) => player.pseudo)
      .filter((pseudo): pseudo is string => pseudo !== null),
  );
  const unmatchedPseudos = detailPseudos.filter(
    (pseudo) => !matchedPseudos.has(pseudo),
  );
  const stillUnknownCount = Math.max(0, unknownCount - unmatchedPseudos.length);

  if (players.length === 0 && unmatchedPseudos.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6"
      aria-labelledby="participants-heading"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="participants-heading" className="text-base font-semibold">
          Autour de la table
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {table.confirmed} inscrit·e{table.confirmed > 1 ? "·s" : ""}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2">
        {players
          .filter((player) => player.pseudo !== null)
          .map((player) => (
            <span key={player.id} className="inline-flex items-center">
              <PlayerBadge player={player} className="py-1 text-xs" />
              {player.id !== currentUserId && player.pseudo !== null && (
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
  );
}

function ParticipantsSkeleton() {
  return (
    <section
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6"
      aria-busy
    >
      <span className="sr-only">Chargement des participants…</span>
      <Skeleton className="h-5 w-40" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 flex flex-col text-sm font-medium">{children}</dd>
      </div>
    </div>
  );
}
