import { z } from "zod";

/**
 * Schémas Zod défensifs pour l'API officielle RPGers.
 * Règle 🔴 (CLAUDE.md §5.2) : TOUTE réponse de l'API officielle passe par ici.
 * Leur schéma change chaque année → un parse échoue de façon explicite et localisée.
 *
 * Champs inconnus : tolérés (`.loose()` implicite de Zod v4 = strip),
 * mais les champs qu'on consomme sont strictement validés.
 */

/**
 * Dates : l'API JSON renvoie des ISO strings, mais les payloads RSC utilisent
 * le préfixe `$D` (`$D2026-08-14T12:00:00.000Z`). On accepte les deux → Date.
 */
export const rpgersDate = z
  .string()
  .transform((s) => (s.startsWith("$D") ? s.slice(2) : s))
  .pipe(z.iso.datetime({ offset: true }).or(z.iso.datetime()))
  .transform((s) => new Date(s));

// ─── User ────────────────────────────────────────────────────────────────────

export const userSummarySchema = z.object({
  id: z.number(),
  pseudo: z.string(),
});

export const userSchema = userSummarySchema.extend({
  isAdmin: z.boolean().default(false),
  isBanned: z.boolean().default(false),
  isAdult: z.boolean().default(false),
});

export type UserSummary = z.infer<typeof userSummarySchema>;
export type User = z.infer<typeof userSchema>;

// ─── Label ───────────────────────────────────────────────────────────────────

export const labelSchema = z.object({
  id: z.number(),
  nom: z.string(),
  couleur: z.string(),
  isSystem: z.boolean().default(false),
  isAdult: z.boolean().default(false),
  // présent sur le catalogue global, absent dans l'emboîté table.labels[].label
  conflictsWith: z.array(z.number()).optional(),
});

export const tableLabelSchema = z.object({
  tableId: z.number(),
  labelId: z.number(),
  label: labelSchema,
});

export type Label = z.infer<typeof labelSchema>;
export type TableLabel = z.infer<typeof tableLabelSchema>;

// ─── Salle ───────────────────────────────────────────────────────────────────

export const salleSchema = z.object({
  id: z.number().optional(), // emboîtée dans Table : pas d'id ; catalogue : id présent
  nom: z.string(),
  lieu: z.string(),
});

export type Salle = z.infer<typeof salleSchema>;

// ─── Registration ────────────────────────────────────────────────────────────

export const registrationSchema = z.object({
  userId: z.number(),
  statut: z.string(), // "confirmed" | … — on ne fige pas l'enum, l'officiel peut en ajouter
});

export type Registration = z.infer<typeof registrationSchema>;

// ─── Table (tablée de jeu) ───────────────────────────────────────────────────

export const tableSchema = z.object({
  id: z.number(),
  titre: z.string(),
  description: z.string(),
  systemeJeu: z.string(),
  ownerId: z.number(),
  salleId: z.number(),
  startDatetime: rpgersDate,
  endDatetime: rpgersDate,
  maxPlayers: z.number(),
  reservedByAdmin: z.number().default(0),
  adminPlaces: z.number().default(2),
  statut: z.string(), // "open" | "canceled" | "finished" | …
  createdAt: rpgersDate.optional(),
  updatedAt: rpgersDate.optional(),
  owner: userSummarySchema,
  salle: salleSchema,
  labels: z.array(tableLabelSchema).default([]),
  registrations: z.array(registrationSchema).default([]),
  _count: z.object({ registrations: z.number() }).optional(),
  // champs calculés côté serveur officiel (jamais recalculés client)
  confirmed: z.number(),
  placesLibresTotal: z.number(),
  placesLibresPubliques: z.number(),
  estComplete: z.boolean(),
  estPlacesAdminUniquement: z.boolean(),
  // enrichissements par requête (vue liste officielle)
  isRegistered: z.boolean().optional(),
  currentUserId: z.number().optional(),
});

export type RpgersTable = z.infer<typeof tableSchema>;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginResponseSchema = z.object({
  success: z.boolean(),
  mustChangePassword: z.boolean().default(false),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

// ─── Notifications ───────────────────────────────────────────────────────────

export const notificationSchema = z
  .object({
    id: z.number(),
    type: z.string().optional(),
    message: z.string(),
    read: z.boolean().default(false),
    createdAt: rpgersDate.optional(),
    tableId: z.number().optional(),
  })
  .loose(); // forme exacte non observée → tolérante, champs clés validés

export const notificationCountSchema = z.object({
  unread: z.number(),
  checkedAt: z.string().optional(),
});

export type RpgersNotification = z.infer<typeof notificationSchema>;
export type NotificationCount = z.infer<typeof notificationCountSchema>;

// ─── Places urgentes ─────────────────────────────────────────────────────────

export const urgentPlaceSchema = z
  .object({
    id: z.number(),
    tableId: z.number().optional(),
    table: tableSchema.partial().optional(),
    message: z.string().optional(),
    createdAt: rpgersDate.optional(),
  })
  .loose(); // forme exacte non observée → tolérante

export type UrgentPlace = z.infer<typeof urgentPlaceSchema>;

// ─── Signalements ────────────────────────────────────────────────────────────

export const signalementSchema = z
  .object({
    id: z.number(),
    type: z.string(),
    message: z.string(),
    salleId: z.number().optional(),
    createdAt: rpgersDate.optional(),
  })
  .loose();

export type Signalement = z.infer<typeof signalementSchema>;

// ─── Erreur API ──────────────────────────────────────────────────────────────

export const apiErrorSchema = z
  .object({
    error: z.string().optional(),
    message: z.string().optional(),
  })
  .loose();
