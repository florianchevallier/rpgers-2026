import { db } from "@/server/db";

/**
 * Favoris entre joueurs — notre couche (absente de l'officiel).
 * On ne stocke que des ids numériques officiels + un pseudo figé à l'ajout
 * (affichage sans round-trip ; peut devenir périmé si le joueur se renomme,
 * acceptable pour un outil de convention de 3 jours).
 */

export type FavoriteUser = {
  id: number;
  pseudo: string;
};

export async function listFavorites(userId: number): Promise<FavoriteUser[]> {
  const rows = await db.favorite.findMany({
    where: { userId },
    orderBy: { favoritePseudo: "asc" },
  });
  return rows.map((r) => ({ id: r.favoriteUserId, pseudo: r.favoritePseudo }));
}

/** Set des ids favoris — pour filtrer les tablées (owner/registrations). */
export async function favoriteIdSet(userId: number): Promise<Set<number>> {
  const rows = await db.favorite.findMany({
    where: { userId },
    select: { favoriteUserId: true },
  });
  return new Set(rows.map((r) => r.favoriteUserId));
}

export async function addFavorite(
  userId: number,
  favoriteUserId: number,
  favoritePseudo: string,
): Promise<void> {
  if (favoriteUserId === userId) return; // pas de favori sur soi-même
  await db.favorite.upsert({
    where: { userId_favoriteUserId: { userId, favoriteUserId } },
    create: { userId, favoriteUserId, favoritePseudo },
    update: { favoritePseudo },
  });
}

export async function removeFavorite(
  userId: number,
  favoriteUserId: number,
): Promise<void> {
  await db.favorite
    .delete({ where: { userId_favoriteUserId: { userId, favoriteUserId } } })
    .catch(() => undefined); // déjà absent : no-op
}
