/**
 * Filtre anti-injures CÔTÉ SERVEUR (🔴 CLAUDE.md §5.3 — l'officiel ne le fait
 * que côté client, donc contournable). Appliqué aux contenus saisis envoyés à
 * l'API officielle (titre, description, système).
 *
 * Liste de base FR compacte + normalisation leet-speak. Volontairement stricte
 * sur les injures explicites, sans prétendre à l'exhaustivité : l'objectif est
 * de ne pas être un relais passif comme le client officiel.
 */

const FORBIDDEN = [
  // insultes FR courantes (radicaux — le pluriel est géré par le matching)
  "connard",
  "connasse",
  "salope",
  "salopard",
  "enculé",
  "encule",
  "pédé",
  "tapette",
  "pute",
  "putain",
  "bâtard",
  "batard",
  "nique ta mère",
  "ntm",
  "fdp",
  "fils de pute",
  "trou du cul",
  "trouduc",
  "pétasse",
  "grognasse",
  "négro",
  "negro",
  "bougnoul",
  "youpin",
  "feuj",
  "bicot",
  "chinetoque",
  "pédale",
  "tarlouze",
  "travelo",
  "gouine",
  "nazi",
  "hitler",
  // EN fréquents
  "nigger",
  "nigga",
  "faggot",
  "whore",
  "slut",
  "cunt",
  "rape",
  "kys",
];

const LEET: Record<string, string> = {
  "4": "a",
  "@": "a",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "5": "s",
  $: "s",
  "7": "t",
  "+": "t",
  "8": "b",
  "9": "g",
  "€": "e",
};

function normalize(input: string): string {
  let out = input.toLowerCase();
  for (const [from, to] of Object.entries(LEET)) {
    out = out.split(from).join(to);
  }
  return out
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_FORBIDDEN = FORBIDDEN.map(normalize).filter(
  (w) => w.length > 1,
);

/** Renvoie le mot interdit trouvé, ou null si le texte est propre. */
export function findForbiddenWord(text: string): string | null {
  const normalized = ` ${normalize(text)} `;
  for (const word of NORMALIZED_FORBIDDEN) {
    // frontière de mot à gauche + pluriel toléré (s/x/es) — évite les faux
    // positifs de sous-chaîne ("pute" ⊂ "réputation") tout en bloquant "connards"
    const re = new RegExp(`(^| )${word}(s|x|es)?( |$)`);
    if (re.test(normalized)) return word;
  }
  return null;
}

/** true si le texte passe le filtre. */
export function isClean(text: string): boolean {
  return findForbiddenWord(text) === null;
}
