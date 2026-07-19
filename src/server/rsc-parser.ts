/**
 * Extraction des tablées depuis le payload RSC (Flight) de la home officielle.
 *
 * L'API JSON officielle ne fournit ni `registrations`, ni les champs calculés
 * (places libres…) : ils n'existent que dans le payload RSC SSR. On parse donc
 * le texte Flight en repérant les objets `{"table":{…},"isRegistered":…}` par
 * appariement d'accolades, puis Zod valide chaque objet (échec explicite si
 * leur format change — règle 🔴 CLAUDE.md §5.2).
 */

export type RscTableWrapper = {
  table: Record<string, unknown>;
  isRegistered?: boolean;
  currentUserId?: number;
};

const MARKER = '"table":{';

/** Extrait les objets JSON équilibrés suivant chaque occurrence de `"table":`. */
export function extractTableWrappers(rscText: string): RscTableWrapper[] {
  const wrappers: RscTableWrapper[] = [];
  let from = 0;

  for (;;) {
    const markerIndex = rscText.indexOf(MARKER, from);
    if (markerIndex === -1) break;

    const tableStart = markerIndex + '"table":'.length;
    const tableJson = readBalanced(rscText, tableStart);
    if (!tableJson) {
      from = markerIndex + MARKER.length;
      continue;
    }

    // le wrapper continue après l'objet table : ,"isRegistered":false,…}
    const wrapperEnd = tableStart + tableJson.length;
    let isRegistered: boolean | undefined;
    let currentUserId: number | undefined;
    const tail = rscText.slice(wrapperEnd, wrapperEnd + 120);
    const reg = /^,"isRegistered":(true|false)/.exec(tail);
    if (reg) isRegistered = reg[1] === "true";
    const uid = /,"currentUserId":(\d+)/.exec(tail);
    if (uid) currentUserId = Number(uid[1]);

    try {
      wrappers.push({
        table: JSON.parse(tableJson) as Record<string, unknown>,
        isRegistered,
        currentUserId,
      });
    } catch {
      // JSON tronqué/inattendu → on saute cette occurrence
    }

    from = wrapperEnd;
  }

  return wrappers;
}

/**
 * Moissonne toutes les paires `{"id":N,"pseudo":"…"}` d'un payload RSC
 * (owners sur la home ; potentiellement les inscrits sur la page détail).
 * Alimente l'annuaire KnownUser — best-effort, une paire ratée n'est pas grave.
 */
export function extractUserSummaries(
  rscText: string,
): { id: number; pseudo: string }[] {
  const users = new Map<number, string>();
  const re = /\{"id":(\d+),"pseudo":"((?:[^"\\]|\\.)*)"/g;
  for (const match of rscText.matchAll(re)) {
    try {
      // JSON.parse pour décoder les échappements (\", \\u00e9…)
      users.set(Number(match[1]), JSON.parse(`"${match[2]}"`) as string);
    } catch {
      // séquence d'échappement invalide → on saute
    }
  }
  return [...users].map(([id, pseudo]) => ({ id, pseudo }));
}

/**
 * Extrait les pseudos des inscrits depuis le payload RSC de la page détail
 * officielle (`/tables/:id`). Les joueurs y sont rendus en JSX pur, SANS
 * userId (vérifié le 19 juil. 2026 sur tablée réelle) :
 *   "children":["Joueurs (",2,"/",5,")"] … ["$","ul",…,
 *     ["$","li","<regId>",{…,"children":[[…"✓"],["$","span",null,{"children":"PetitCastor"}],…
 * → on repère la section « Joueurs ( », on lit le <ul> équilibré, puis les
 * spans dont l'unique prop est `children` (le ✓ a un style, il ne matche pas).
 */
export function extractDetailPlayerPseudos(rscText: string): string[] {
  const marker = rscText.indexOf('"Joueurs (');
  if (marker === -1) return [];
  const ulStart = rscText.indexOf('["$","ul"', marker);
  if (ulStart === -1) return [];
  const braceStart = rscText.indexOf("{", ulStart);
  if (braceStart === -1) return [];
  const ulJson = readBalanced(rscText, braceStart);
  if (!ulJson) return [];

  const pseudos = new Set<string>();
  for (const match of ulJson.matchAll(/\{"children":"((?:[^"\\]|\\.)*)"\}/g)) {
    try {
      const value = JSON.parse(`"${match[1]}"`) as string;
      if (value && value !== "✓") pseudos.add(value);
    } catch {
      // séquence d'échappement invalide → on saute
    }
  }
  return [...pseudos];
}

/** Lit un objet JSON `{…}` équilibré commençant à `start` (rscText[start] === '{'). */
function readBalanced(text: string, start: number): string | null {
  if (text[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
