import { CircleHelp, Clock, Crown, Dices, Flag, Heart } from "lucide-react";
import Link from "next/link";
import { FavoritesManager } from "@/components/profile/favorites-manager";
import { LogoutButton } from "@/components/profile/logout-button";
import { computePlayerStats } from "@/domain/stats";
import { requirePageSession } from "@/server/auth";
import { listFavorites } from "@/server/favorites";
import { getTables } from "@/server/rpgers-client";

export const revalidate = 30;

export default async function ProfilePage() {
  const session = await requirePageSession();
  const [tables, favorites] = await Promise.all([
    getTables(session.jwt),
    listFavorites(session.user.id),
  ]);

  const stats = computePlayerStats(tables, session.user.id);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          {session.user.pseudo}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tes statistiques et tes joueurs favoris.
        </p>
      </header>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="day-heading">
          Mes stats
        </h2>
        <div className="mt-1 border-t border-primary/30" aria-hidden />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Dices}
            label="Parties jouées"
            value={stats.tablesAsPlayer}
          />
          <StatCard
            icon={Crown}
            label="Parties menées"
            value={stats.tablesAsGm}
          />
          <StatCard
            icon={Clock}
            label="Heures de jeu"
            value={stats.totalHours}
          />
          <StatCard icon={Heart} label="Favoris" value={favorites.length} />
        </div>

        {stats.topLabels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {stats.topLabels.map((l) => (
              <span
                key={l.nom}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs"
              >
                <span
                  className="size-2 rounded-full ring-1 ring-black/20"
                  style={{ backgroundColor: l.couleur }}
                  aria-hidden
                />
                {l.nom} × {l.count}
              </span>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="favorites-heading">
        <h2 id="favorites-heading" className="day-heading">
          Mes favoris
        </h2>
        <div className="mt-1 border-t border-primary/30" aria-hidden />
        <p className="mt-2 text-xs text-muted-foreground">
          Le filtre « Mes favoris » affiche les parties où l&apos;un de tes
          favoris est MJ ou participant.
        </p>
        <div className="mt-4">
          <FavoritesManager
            currentUserId={session.user.id}
            initialFavorites={favorites}
          />
        </div>
      </section>

      <nav aria-label="Aide et support" className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/faq"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent"
        >
          <CircleHelp className="size-5 text-primary" aria-hidden />
          <span className="font-medium">Aide et questions fréquentes</span>
        </Link>
        <Link
          href="/signalement"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent"
        >
          <Flag className="size-5 text-primary" aria-hidden />
          <span className="font-medium">Signaler un problème</span>
        </Link>
      </nav>

      <div className="flex justify-end border-t border-border pt-6">
        <LogoutButton />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 text-center">
      <Icon className="mx-auto size-5 text-primary" aria-hidden />
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
