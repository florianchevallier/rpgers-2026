import { z } from "zod";
import { enrichRawTable } from "@/domain/derived-fields";
import { getEnv } from "@/server/env";
import {
  apiErrorSchema,
  type LoginResponse,
  loginResponseSchema,
  type NotificationCount,
  notificationCountSchema,
  notificationSchema,
  type RpgersNotification,
  type RpgersTable,
  rawTableSchema,
  type Salle,
  type Signalement,
  salleSchema,
  signalementSchema,
  tableSchema,
  type UrgentPlace,
  type UserSummary,
  urgentPlaceSchema,
  userSummarySchema,
} from "@/server/rpgers-schemas";
import { extractTableWrappers } from "@/server/rsc-parser";

/** Cookie de session officiel (JWT HS256, 7 j) — détenu UNIQUEMENT ici, côté serveur. */
export const OFFICIAL_COOKIE_NAME = "rpgers_2026_session";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class SchemaError extends Error {
  constructor(
    public readonly path: string,
    public readonly issues: unknown,
  ) {
    super(`Réponse inattendue de l'API officielle sur ${path}`);
    this.name = "SchemaError";
  }
}

type FetchOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  /** JWT officiel (session serveur). Jamais exposé au navigateur. */
  jwt?: string;
  /** Laisser passer les 401/403 sans throw (ex. sonder la session) */
  allowUnauthorized?: boolean;
};

async function rawFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  { method = "GET", body, jwt, allowUnauthorized }: FetchOptions = {},
): Promise<T> {
  const { RPGERS_API_URL } = getEnv();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (jwt) headers.Cookie = `${OFFICIAL_COOKIE_NAME}=${jwt}`;

  let res: Response;
  try {
    res = await fetch(`${RPGERS_API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store", // la fraîcheur est gérée par notre couche cache/SSE
      signal: AbortSignal.timeout(10_000),
    });
  } catch (_cause) {
    throw new ApiError("API officielle injoignable", 0, path);
  }

  if (allowUnauthorized && (res.status === 401 || res.status === 403)) {
    return undefined as T;
  }

  const json: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    const message = parsed.success
      ? (parsed.data.message ?? parsed.data.error ?? `Erreur ${res.status}`)
      : `Erreur ${res.status}`;
    throw new ApiError(message, res.status, path);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new SchemaError(path, parsed.error.issues);
  }
  return parsed.data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export type OfficialLogin = {
  jwt: string;
  jwtExpiresAt: Date | null;
  result: LoginResponse;
};

/** Login officiel : renvoie le JWT (Set-Cookie) à garder en session serveur. */
export async function loginOfficial(
  pseudo: string,
  password: string,
): Promise<OfficialLogin> {
  const { RPGERS_API_URL } = getEnv();
  const res = await fetch(`${RPGERS_API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pseudo, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    throw new ApiError(
      parsed.success
        ? (parsed.data.message ?? parsed.data.error ?? "Identifiants invalides")
        : "Identifiants invalides",
      res.status,
      "/api/auth/login",
    );
  }

  const setCookies = res.headers.getSetCookie();
  const sessionCookie = setCookies.find((c) =>
    c.startsWith(`${OFFICIAL_COOKIE_NAME}=`),
  );
  const jwt = sessionCookie?.split(";")[0]?.split("=")[1];
  if (!jwt) {
    throw new ApiError(
      "Cookie de session officiel absent",
      500,
      "/api/auth/login",
    );
  }

  const expires = /expires=([^;]+)/i.exec(sessionCookie)?.[1];
  const result = loginResponseSchema.parse(json);
  return {
    jwt,
    jwtExpiresAt: expires ? new Date(expires) : null,
    result,
  };
}

export async function logoutOfficial(jwt: string): Promise<void> {
  await rawFetch("/api/auth/logout", z.unknown(), {
    method: "POST",
    jwt,
  }).catch(
    () => undefined, // best-effort : on détruit notre session locale quoiqu'il arrive
  );
}

export async function registerOfficial(input: {
  pseudo: string;
  email?: string;
  password: string;
  isAdult: boolean;
}): Promise<void> {
  await rawFetch("/api/auth/register", z.unknown(), {
    method: "POST",
    body: input,
  });
}

// ─── Tables ──────────────────────────────────────────────────────────────────

/**
 * Liste des tablées.
 *
 * Source primaire = payload RSC de la home officielle (`GET /`, header RSC:1) :
 * c'est la SEULE source qui contient `registrations` (indispensable pour
 * « Mes Parties ») et les champs calculés officiels.
 * Repli = `GET /api/tables` (JSON brut) + dérivation des champs calculés
 * côté BFF ; dans ce mode `registrations` est vide (fonctionnement dégradé).
 */
export async function getTables(jwt: string): Promise<RpgersTable[]> {
  try {
    return await getTablesFromRsc(jwt);
  } catch (error) {
    console.warn("[rpgers] RSC indisponible, repli sur /api/tables :", error);
    return getTablesFromJsonApi(jwt);
  }
}

async function getTablesFromRsc(jwt: string): Promise<RpgersTable[]> {
  const { RPGERS_API_URL } = getEnv();
  const res = await fetch(`${RPGERS_API_URL}/`, {
    headers: { Cookie: `${OFFICIAL_COOKIE_NAME}=${jwt}`, RSC: "1" },
    cache: "no-store",
    redirect: "error", // une redirection = session invalide, pas du RSC
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new ApiError(`RSC home ${res.status}`, res.status, "/");

  const text = await res.text();
  const wrappers = extractTableWrappers(text);
  if (wrappers.length === 0) {
    throw new SchemaError("/ (RSC)", "aucune tablée extraite du payload");
  }

  const tables = wrappers.map((w) => ({
    ...w.table,
    ...(w.isRegistered !== undefined ? { isRegistered: w.isRegistered } : {}),
    ...(w.currentUserId !== undefined
      ? { currentUserId: w.currentUserId }
      : {}),
  }));
  const parsed = z.array(tableSchema).safeParse(tables);
  if (!parsed.success) throw new SchemaError("/ (RSC)", parsed.error.issues);

  // dédoublonne par id (le payload peut répéter des références)
  const byId = new Map<number, RpgersTable>();
  for (const table of parsed.data) byId.set(table.id, table);
  return [...byId.values()];
}

async function getTablesFromJsonApi(jwt: string): Promise<RpgersTable[]> {
  const raw = await rawFetch("/api/tables", z.array(rawTableSchema), { jwt });
  return raw.map(enrichRawTable);
}

/**
 * Détail tablée — l'officiel n'a PAS d'endpoint JSON détail (405) :
 * on lit depuis la liste (cachée en amont par le BFF).
 */
export async function getTable(jwt: string, id: number): Promise<RpgersTable> {
  const tables = await getTables(jwt);
  const table = tables.find((t) => t.id === id);
  if (!table)
    throw new ApiError("Tablée introuvable", 404, `/api/tables/${id}`);
  return table;
}

export async function createTable(
  jwt: string,
  input: {
    titre: string;
    description: string;
    systemeJeu: string;
    startDatetime: string; // ISO
    endDatetime: string; // ISO
    maxPlayers: number;
    reservedByAdmin: number;
    adminPlaces: number;
    invitedUserIds: number[];
    labelIds: number[];
    // ⚠️ ownerId n'est ajouté par l'appelant QUE si isAdmin a été revérifié côté serveur
    ownerId?: number;
  },
): Promise<{ id: number }> {
  return rawFetch("/api/tables", z.object({ id: z.number() }).loose(), {
    method: "POST",
    body: input,
    jwt,
  });
}

/** Inscription : self ({} par défaut) ou d'un tiers ({pseudo}). */
export async function registerToTable(
  jwt: string,
  tableId: number,
  forPseudo?: string,
): Promise<void> {
  await rawFetch(`/api/tables/${tableId}/register`, z.unknown(), {
    method: "POST",
    body: forPseudo ? { pseudo: forPseudo } : {},
    jwt,
  });
}

/** Désinscription : self ou d'un tiers ({userId}). Bloquée < 1 h avant par l'officiel. */
export async function unregisterFromTable(
  jwt: string,
  tableId: number,
  forUserId?: number,
): Promise<void> {
  await rawFetch(`/api/tables/${tableId}/register`, z.unknown(), {
    method: "DELETE",
    body: forUserId ? { userId: forUserId } : {},
    jwt,
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function searchUsers(
  jwt: string,
  query: string,
  opts: { excludeIds?: number[]; tableId?: number } = {},
): Promise<UserSummary[]> {
  const params = new URLSearchParams({ q: query });
  if (opts.excludeIds?.length)
    params.set("excludeIds", opts.excludeIds.join(","));
  if (opts.tableId) params.set("tableId", String(opts.tableId));
  return rawFetch(`/api/users/search?${params}`, z.array(userSummarySchema), {
    jwt,
  });
}

export async function checkOverlap(
  jwt: string,
  input: { userId: number; startDatetime: string; endDatetime: string },
): Promise<{ overlap: boolean }> {
  return rawFetch(
    "/api/users/check-overlap",
    z.object({ overlap: z.boolean() }).loose(),
    { method: "POST", body: input, jwt },
  );
}

// ─── Salles ──────────────────────────────────────────────────────────────────

export async function getSalles(jwt: string): Promise<Salle[]> {
  return rawFetch("/api/salles", z.array(salleSchema), { jwt });
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getNotifications(
  jwt: string,
): Promise<RpgersNotification[]> {
  return rawFetch("/api/notifications", z.array(notificationSchema), { jwt });
}

export async function getNotificationCount(
  jwt: string,
  since?: string,
): Promise<NotificationCount> {
  const params = since ? `?since=${encodeURIComponent(since)}` : "";
  return rawFetch(
    `/api/notifications/count${params}`,
    notificationCountSchema,
    { jwt },
  );
}

export async function markNotificationsRead(jwt: string): Promise<void> {
  await rawFetch("/api/notifications/mark-read", z.unknown(), {
    method: "POST",
    jwt,
  });
}

// ─── Places urgentes ─────────────────────────────────────────────────────────

export async function getUrgentPlaces(jwt: string): Promise<UrgentPlace[]> {
  return rawFetch("/api/urgent", z.array(urgentPlaceSchema), { jwt });
}

export async function respondUrgentPlace(
  jwt: string,
  id: number,
  reponse: "yes" | "no",
): Promise<void> {
  await rawFetch(`/api/urgent/${id}/respond`, z.unknown(), {
    method: "POST",
    body: { reponse },
    jwt,
  });
}

// ─── Signalements ────────────────────────────────────────────────────────────

export async function getSignalements(jwt: string): Promise<Signalement[]> {
  return rawFetch("/api/signalements", z.array(signalementSchema), { jwt });
}

export async function createSignalement(
  jwt: string,
  input: { type: string; message: string; salleId?: number },
): Promise<void> {
  await rawFetch("/api/signalements", z.unknown(), {
    method: "POST",
    body: input,
    jwt,
  });
}
