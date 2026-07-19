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
