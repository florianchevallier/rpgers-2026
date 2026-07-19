import type { RawRpgersTable, RpgersTable } from "@/server/rpgers-schemas";

/**
 * Dérivation des champs calculés — logique PURE (testée).
 *
 * L'API JSON officielle ne fournit pas les champs calculés (places libres…) :
 * on les dérive ici des données brutes. Formules vérifiées contre le payload
 * RSC officiel (fixture #6038 : maxPlayers 6, adminPlaces 2, confirmed 3 →
 * placesLibresTotal 3, placesLibresPubliques 1).
 */
export function deriveComputedFields(
  raw: RawRpgersTable,
): Pick<
  RpgersTable,
  | "confirmed"
  | "placesLibresTotal"
  | "placesLibresPubliques"
  | "estComplete"
  | "estPlacesAdminUniquement"
> {
  const confirmed = raw._count?.registrations ?? 0;
  const placesLibresTotal = Math.max(0, raw.maxPlayers - confirmed);
  const placesLibresPubliques = Math.max(
    0,
    raw.maxPlayers - raw.adminPlaces - raw.reservedByAdmin - confirmed,
  );
  return {
    confirmed,
    placesLibresTotal,
    placesLibresPubliques,
    estComplete: placesLibresTotal <= 0,
    estPlacesAdminUniquement:
      placesLibresPubliques <= 0 && placesLibresTotal > 0,
  };
}

/** Complète une tablée brute de l'API JSON en tablée enrichie (fallback sans RSC). */
export function enrichRawTable(raw: RawRpgersTable): RpgersTable {
  return {
    ...raw,
    registrations: [], // non exposé par l'API JSON — "mes parties" indisponible en mode dégradé
    ...deriveComputedFields(raw),
  };
}
