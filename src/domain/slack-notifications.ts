type Identified = { id: number };

type EditorialFactsInput = {
  maxPlayers: number;
  placesLibresPubliques: number;
  estPlacesAdminUniquement: boolean;
  labels: Array<{ nom: string; isAdult: boolean }>;
};

export type EditorialFacts = {
  seats: string;
  audience: string;
  accessibility: string;
  contentWarnings: string[];
  milo: {
    verdict: "recommended" | "needs_review" | "blocked";
    text: string | null;
  };
};

const SOURCE_NAMES: Array<[string, string, number]> = [
  ["legrog.org", "GROG", 0],
  ["black-book-editions.fr", "Black Book", 1],
  ["edge-studio.net", "Edge", 1],
  ["chaosium.com", "Chaosium", 1],
  ["dndbeyond.com", "D&D Beyond", 1],
  ["wikipedia.org", "Wikipedia", 3],
];

export function gameResearchKey(systemName: string): string | null {
  const normalized = systemName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  if (
    /creation originale|systeme maison|jeu maison|original creation|homebrew/.test(
      normalized,
    )
  ) {
    return null;
  }
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function cleanGameResearchSummary(summary: string): string | null {
  const normalized = summary
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (
    /jeu_non_identifie|jeu non identifie|il n.existe pas|aucun editeur identifie|probablement (un )?jeu maison|ne correspond a aucun/.test(
      normalized,
    )
  ) {
    return null;
  }
  return summary
    .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function selectBestGameSource(
  sources: readonly string[],
): { url: string; name: string } | null {
  const candidates = sources.flatMap((source) => {
    try {
      const url = new URL(source);
      if (url.protocol !== "https:") return [];
      const hostname = url.hostname.toLowerCase();
      const known = SOURCE_NAMES.find(
        ([domain]) => hostname === domain || hostname.endsWith(`.${domain}`),
      );
      return [
        {
          url: source,
          name: known?.[1] ?? url.hostname.replace(/^www\./, "").split(".")[0],
          rank: known?.[2] ?? 2,
        },
      ];
    } catch {
      return [];
    }
  });

  candidates.sort((left, right) => left.rank - right.rank);
  const best = candidates[0];
  return best ? { url: best.url, name: best.name || "Source" } : null;
}

export function deriveEditorialFacts(
  input: EditorialFactsInput,
): EditorialFacts {
  const normalizedLabels = input.labels.map(({ nom }) =>
    nom
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase(),
  );
  const contentWarnings = input.labels
    .filter((label) => label.isAdult)
    .map((label) => label.nom);
  const places = input.placesLibresPubliques;
  const seats = input.estPlacesAdminUniquement
    ? "Complet côté public — places administrateur uniquement"
    : `${places} place${places === 1 ? "" : "s"} disponible${places === 1 ? "" : "s"} sur ${input.maxPlayers}`;
  const welcomesBeginners = normalizedLabels.some((label) =>
    label.includes("debutants bienvenus"),
  );

  if (contentWarnings.length > 0) {
    return {
      seats,
      audience: "Public adulte",
      accessibility: welcomesBeginners
        ? "Débutants bienvenus"
        : "Niveau à confirmer avec le MJ",
      contentWarnings,
      milo: {
        verdict: "blocked",
        text: `❌ Trop mature — contenu adulte signalé : ${contentWarnings.join(", ")}.`,
      },
    };
  }

  const isForChildren = normalizedLabels.some((label) =>
    label.includes("pegi : enfant"),
  );
  const isForTeenagers = normalizedLabels.some((label) =>
    label.includes("pegi : ado"),
  );
  if (isForChildren) {
    return {
      seats,
      audience: "Public enfant",
      accessibility: welcomesBeginners
        ? "Débutants bienvenus"
        : "Niveau à confirmer avec le MJ",
      contentWarnings,
      milo: {
        verdict: "recommended",
        text: welcomesBeginners
          ? "✅ OK pour Milo — table annoncée pour les enfants et les débutants."
          : "✅ OK pour Milo — table annoncée pour les enfants.",
      },
    };
  }

  return {
    seats,
    audience: isForTeenagers ? "Public adolescent" : "Public non précisé",
    accessibility: welcomesBeginners
      ? "Débutants bienvenus"
      : "Niveau à confirmer avec le MJ",
    contentWarnings,
    milo: { verdict: "needs_review", text: null },
  };
}

/** Sélectionne les tablées présentes qui n'ont encore jamais été annoncées. */
export function findUnannouncedTables<T extends Identified>(
  tables: readonly T[],
  announcedIds: ReadonlySet<number>,
): T[] {
  return tables.filter((table) => !announcedIds.has(table.id));
}

export function planSlackSync<T extends Identified>(
  tables: readonly T[],
  announcedIds: ReadonlySet<number>,
  initialized: boolean,
): { baseline: T[]; notifications: T[] } {
  if (!initialized) {
    return { baseline: [...tables], notifications: [] };
  }

  return {
    baseline: [],
    notifications: findUnannouncedTables(tables, announcedIds),
  };
}
