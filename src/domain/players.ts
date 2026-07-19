/**
 * Joueurs présents à une tablée — logique PURE (testée).
 * Les registrations officielles ne portent que des userId : les pseudos
 * viennent de l'annuaire KnownUser (résolu en amont), les favoris de notre DB.
 */

export type PlayerChip = {
  id: number;
  /** null = pseudo inconnu de l'annuaire (fonctionnement dégradé) */
  pseudo: string | null;
  isFavorite: boolean;
};

type RegistrationLike = { userId: number; statut: string };

/**
 * Construit la liste des joueurs présents : inscrits confirmés, dédoublonnés,
 * favoris d'abord puis pseudos connus (alpha), inconnus en dernier.
 */
export function buildPlayerChips(
  registrations: RegistrationLike[],
  pseudoById: ReadonlyMap<number, string>,
  favoriteIds: ReadonlySet<number>,
): PlayerChip[] {
  const seen = new Set<number>();
  const chips: PlayerChip[] = [];
  for (const reg of registrations) {
    if (reg.statut !== "confirmed" || seen.has(reg.userId)) continue;
    seen.add(reg.userId);
    chips.push({
      id: reg.userId,
      pseudo: pseudoById.get(reg.userId) ?? null,
      isFavorite: favoriteIds.has(reg.userId),
    });
  }
  return chips.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    if ((a.pseudo === null) !== (b.pseudo === null))
      return a.pseudo === null ? 1 : -1;
    return (a.pseudo ?? "").localeCompare(b.pseudo ?? "");
  });
}

/**
 * Tronque pour l'affichage compact (carte) : on ne montre que des chips
 * nommées, le reste (dépassement + pseudos inconnus) devient un compteur.
 */
export function capPlayerChips(
  chips: PlayerChip[],
  max: number,
): { shown: PlayerChip[]; hiddenCount: number } {
  const named = chips.filter((c) => c.pseudo !== null);
  const shown = named.slice(0, max);
  return { shown, hiddenCount: chips.length - shown.length };
}
