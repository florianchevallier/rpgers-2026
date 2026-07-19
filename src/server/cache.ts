/**
 * Cache mémoire TTL léger (mono-instance — cf. plan §6 : SQLite/mono-conteneur).
 * Pour les données quasi-statiques pendant l'évènement : salles, labels.
 * Les listes de tablées ne passent PAS ici : leur fraîcheur est gérée par
 * le temps réel SSE + invalidation TanStack Query.
 */
type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = await fetcher();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function invalidate(keyPrefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) store.delete(key);
  }
}
