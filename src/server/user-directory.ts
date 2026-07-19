import { db } from "@/server/db";
import { searchUsers } from "@/server/rpgers-client";
import type { UserSummary } from "@/server/rpgers-schemas";

/**
 * Annuaire id officiel → pseudo (modèle KnownUser).
 * L'API officielle ne met que des userId nus dans `registrations` : on
 * moissonne les paires {id, pseudo} partout où elles passent (owners du
 * payload RSC, recherche de joueurs, favoris, RSC détail tablée) pour pouvoir
 * afficher « qui sera présent » sur les cartes et la fiche.
 */

/** Upsert en masse, best-effort : un échec DB ne doit jamais casser une page. */
export async function harvestUsers(users: UserSummary[]): Promise<void> {
  if (users.length === 0) return;
  // dédoublonne par id (le payload RSC répète les mêmes owners)
  const byId = new Map(users.map((u) => [u.id, u.pseudo]));
  try {
    await db.$transaction(
      [...byId].map(([id, pseudo]) =>
        db.knownUser.upsert({
          where: { id },
          create: { id, pseudo },
          update: { pseudo },
        }),
      ),
    );
  } catch (error) {
    console.warn("[annuaire] moisson ignorée :", error);
  }
}

/**
 * Apparie des pseudos (extraits du RSC détail, qui ne porte PAS les userId)
 * avec leurs ids officiels : annuaire d'abord, puis la recherche officielle
 * pour les manquants (1 appel séquentiel par pseudo, moissonné ensuite →
 * coût unique par joueur, plus rien aux visites suivantes). Best-effort.
 */
export async function resolveUsersByPseudos(
  jwt: string,
  pseudos: string[],
): Promise<UserSummary[]> {
  if (pseudos.length === 0) return [];
  const known = await db.knownUser
    .findMany({ where: { pseudo: { in: pseudos } } })
    .catch(() => []);
  const knownPseudos = new Set(known.map((k) => k.pseudo));

  const found: UserSummary[] = [];
  for (const pseudo of pseudos.filter((p) => !knownPseudos.has(p))) {
    const results = await searchUsers(jwt, pseudo).catch(() => []);
    const hit =
      results.find((u) => u.pseudo === pseudo) ??
      results.find((u) => u.pseudo.toLowerCase() === pseudo.toLowerCase());
    if (hit) found.push(hit);
  }
  await harvestUsers(found);

  return [...known.map((k) => ({ id: k.id, pseudo: k.pseudo })), ...found];
}

/** Résout un lot d'ids → pseudos connus (les inconnus sont absents de la map). */
export async function resolvePseudos(
  ids: number[],
): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db.knownUser.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, pseudo: true },
  });
  return new Map(rows.map((r) => [r.id, r.pseudo]));
}
