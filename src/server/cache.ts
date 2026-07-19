/** Cache mémoire TTL léger, partagé entre les bundles serveur Next.js. */
type Entry<T> = {
  value: T;
  freshUntil: number;
  staleUntil: number;
};

type CacheState = {
  store: Map<string, Entry<unknown>>;
  inFlight: Map<string, Promise<unknown>>;
  versions: Map<string, number>;
};

const globalCache = globalThis as typeof globalThis & {
  __rpgersCache?: CacheState;
};
let cacheState = globalCache.__rpgersCache;
if (!cacheState) {
  cacheState = {
    store: new Map(),
    inFlight: new Map(),
    versions: new Map(),
  };
  globalCache.__rpgersCache = cacheState;
}
const { store, inFlight, versions } = cacheState;

function refresh<T>(
  key: string,
  freshTtlMs: number,
  staleTtlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const version = versions.get(key) ?? 0;
  const request = fetcher()
    .then((value) => {
      if ((versions.get(key) ?? 0) === version) {
        const now = Date.now();
        store.set(key, {
          value,
          freshUntil: now + freshTtlMs,
          staleUntil: now + freshTtlMs + staleTtlMs,
        });
      }
      return value;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, request);
  return request;
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.freshUntil > Date.now()) return hit.value;

  return refresh(key, ttlMs, 0, fetcher);
}

/**
 * Stale-while-revalidate mémoire : une donnée légèrement ancienne est rendue
 * immédiatement pendant que sa mise à jour se fait en arrière-plan. Si la
 * source tombe, la dernière valeur connue reste disponible.
 */
export async function cachedSWR<T>(
  key: string,
  freshTtlMs: number,
  staleTtlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (hit?.freshUntil && hit.freshUntil > now) return hit.value;

  if (hit && hit.staleUntil > now) {
    void refresh(key, freshTtlMs, staleTtlMs, fetcher).catch(() => undefined);
    return hit.value;
  }

  try {
    return await refresh(key, freshTtlMs, staleTtlMs, fetcher);
  } catch (error) {
    if (hit) return hit.value;
    throw error;
  }
}

export function invalidate(keyPrefix: string): void {
  const keys = new Set([...store.keys(), ...inFlight.keys()]);
  for (const key of keys) {
    if (!key.startsWith(keyPrefix)) continue;
    versions.set(key, (versions.get(key) ?? 0) + 1);
    store.delete(key);
  }
}
