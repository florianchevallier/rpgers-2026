import { Heart, Users } from "lucide-react";
import { capPlayerChips, type PlayerChip } from "@/domain/players";
import { cn } from "@/lib/utils";

/** Chip d'un joueur présent — liseré doré + cœur si c'est un favori. */
export function PlayerBadge({
  player,
  className,
}: {
  player: PlayerChip;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-xs text-secondary-foreground",
        player.isFavorite &&
          "border-primary/70 bg-primary/10 text-primary ring-1 ring-primary/40",
        className,
      )}
    >
      {player.isFavorite && (
        <Heart className="size-3 fill-current" aria-hidden />
      )}
      {player.pseudo ?? `Participant·e #${player.id}`}
      {player.isFavorite && <span className="sr-only"> (favori)</span>}
    </span>
  );
}

type StripProps = {
  players: PlayerChip[];
  /** nb max de chips nommées (mode compact carte) ; absent = tout afficher */
  max?: number;
  className?: string;
};

/**
 * Rangée « qui sera présent » : favoris d'abord (liseré doré), puis pseudos
 * connus ; les inscrits au pseudo inconnu de l'annuaire sont regroupés en
 * compteur (l'API officielle ne donne que des userId nus dans la liste).
 */
export function PlayersStrip({ players, max, className }: StripProps) {
  if (players.length === 0) return null;

  const { shown, hiddenCount } =
    max !== undefined
      ? capPlayerChips(players, max)
      : {
          shown: players.filter((p) => p.pseudo !== null || p.isFavorite),
          hiddenCount: players.filter((p) => p.pseudo === null && !p.isFavorite)
            .length,
        };

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label="Joueur·euse·s inscrit·e·s"
    >
      <Users className="size-3.5 text-muted-foreground" aria-hidden />
      {shown.map((player) => (
        <li key={player.id} className="contents">
          <PlayerBadge player={player} />
        </li>
      ))}
      {hiddenCount > 0 && (
        <li className="text-xs text-muted-foreground">
          {shown.length > 0
            ? `+${hiddenCount} autre${hiddenCount > 1 ? "s" : ""}`
            : `${hiddenCount} inscrit·e${hiddenCount > 1 ? "s" : ""}`}
        </li>
      )}
    </ul>
  );
}
