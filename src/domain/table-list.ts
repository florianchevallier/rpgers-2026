import type {
  Label,
  RpgersTable,
  Salle,
  UserSummary,
} from "@/server/rpgers-schemas";

/**
 * Forme compacte envoyée au navigateur pour la liste. Les descriptions et
 * métadonnées d'administration restent sur le serveur et sur la fiche détail.
 */
export type RpgersTableListItem = Pick<
  RpgersTable,
  | "id"
  | "titre"
  | "systemeJeu"
  | "ownerId"
  | "startDatetime"
  | "endDatetime"
  | "maxPlayers"
  | "confirmed"
  | "placesLibresTotal"
  | "placesLibresPubliques"
> & {
  owner: Pick<UserSummary, "id" | "pseudo">;
  salle: Pick<Salle, "nom">;
  labels: Array<{
    labelId: number;
    label: Pick<Label, "id" | "nom" | "couleur">;
  }>;
  registrations: RpgersTable["registrations"];
};

export function toTableListItem(table: RpgersTable): RpgersTableListItem {
  return {
    id: table.id,
    titre: table.titre,
    systemeJeu: table.systemeJeu,
    ownerId: table.ownerId,
    startDatetime: table.startDatetime,
    endDatetime: table.endDatetime,
    maxPlayers: table.maxPlayers,
    confirmed: table.confirmed,
    placesLibresTotal: table.placesLibresTotal,
    placesLibresPubliques: table.placesLibresPubliques,
    owner: { id: table.owner.id, pseudo: table.owner.pseudo },
    salle: { nom: table.salle.nom },
    labels: table.labels.map(({ labelId, label }) => ({
      labelId,
      label: {
        id: label.id,
        nom: label.nom,
        couleur: label.couleur,
      },
    })),
    registrations: table.registrations,
  };
}
