import { tablesToMarkdown } from "@/domain/tables-markdown";
import { requireSession } from "@/server/auth";
import { getTableDetailPseudos, getTables } from "@/server/rpgers-client";
import { resolvePseudos } from "@/server/user-directory";

const MARKDOWN_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Disposition": 'inline; filename="rpgers-parties.md"',
  "Content-Type": "text/markdown; charset=utf-8",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return markdownResponse(
      "# Authentification requise\n\nConnectez-vous à Critiquest pour consulter les parties.\n",
      401,
    );
  }

  try {
    const tables = await getTables(session.jwt);
    const pseudoById = await resolvePseudos(
      tables.flatMap((table) =>
        table.registrations.map(({ userId }) => userId),
      ),
    );
    const participantPseudosByTableId = await loadMissingParticipantPseudos(
      session.jwt,
      tables,
      pseudoById,
    );
    const markdown = tablesToMarkdown(tables, {
      origin: new URL(request.url).origin,
      pseudoById,
      participantPseudosByTableId,
    });
    return markdownResponse(markdown);
  } catch (error) {
    console.error("[rpgers] génération Markdown impossible :", error);
    return markdownResponse(
      "# Parties temporairement indisponibles\n\nImpossible de charger la liste. Réessayez dans un instant.\n",
      503,
    );
  }
}

async function loadMissingParticipantPseudos(
  jwt: string,
  tables: Awaited<ReturnType<typeof getTables>>,
  pseudoById: ReadonlyMap<number, string>,
): Promise<Map<number, string[]>> {
  const missing = tables.filter((table) =>
    table.registrations.some(
      ({ userId, statut }) => statut === "confirmed" && !pseudoById.has(userId),
    ),
  );
  const result = new Map<number, string[]>();
  const concurrency = 6;

  for (let index = 0; index < missing.length; index += concurrency) {
    const batch = missing.slice(index, index + concurrency);
    const pseudos = await Promise.all(
      batch.map((table) => getTableDetailPseudos(jwt, table.id)),
    );
    for (const [batchIndex, table] of batch.entries()) {
      if (pseudos[batchIndex].length > 0) {
        result.set(table.id, pseudos[batchIndex]);
      }
    }
  }
  return result;
}

function markdownResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: MARKDOWN_HEADERS,
  });
}
