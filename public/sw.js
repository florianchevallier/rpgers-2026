const VERSION = "v0.3.1";
const STATIC_CACHE = `rpgers-static-${VERSION}`;
const PAGE_CACHE = `rpgers-pages-${VERSION}`;
const CACHE_PREFIX = "rpgers-";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: "reload" })),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== STATIC_CACHE &&
                key !== PAGE_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  await Promise.all(
    keys
      .slice(0, Math.max(0, keys.length - maxEntries))
      .map((key) => cache.delete(key)),
  );
}

async function cacheResponse(cacheName, request, response, maxEntries) {
  if (!response.ok || response.type !== "basic") return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  await trimCache(cache, maxEntries);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  await cacheResponse(STATIC_CACHE, request, response, 180);
  return response;
}

async function cachedPageFallback(request) {
  const pages = await caches.open(PAGE_CACHE);
  return (
    (await pages.match(request)) ??
    (await pages.match(request, { ignoreSearch: true })) ??
    (await caches.match(OFFLINE_URL))
  );
}

async function pageNetworkFirst(request) {
  try {
    const response = await fetchWithTimeout(request, 1800);
    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType.includes("text/html") ||
      contentType.includes("text/x-component")
    ) {
      await cacheResponse(PAGE_CACHE, request, response, 240);
    }
    return response;
  } catch {
    return (
      (await cachedPageFallback(request)) ??
      new Response("Hors ligne", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function clearPrivatePages() {
  await caches.delete(PAGE_CACHE);
}

async function handleMutation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await clearPrivatePages();
    return response;
  } catch {
    return Response.json(
      { error: "Connexion requise pour effectuer cette action." },
      { status: 503 },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.method !== "GET") {
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(handleMutation(request));
    }
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(?:css|js|woff2?|png|jpe?g|webp|avif|gif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  const acceptsRsc =
    request.headers.get("RSC") === "1" ||
    (request.headers.get("accept") ?? "").includes("text/x-component");
  if (request.mode === "navigate" || acceptsRsc) {
    event.respondWith(pageNetworkFirst(request));
  }
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.type === "CLEAR_PRIVATE_CACHES") {
    event.waitUntil(clearPrivatePages());
    return;
  }

  if (data?.type !== "WARM_ROUTES" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      for (const path of data.urls.slice(0, 8)) {
        if (typeof path !== "string" || !path.startsWith("/")) continue;
        try {
          const request = new Request(path, {
            credentials: "include",
            headers: { Accept: "text/html" },
          });
          const response = await fetch(request);
          if (response.ok && !response.redirected) {
            await cacheResponse(PAGE_CACHE, request, response, 240);
          }
        } catch {
          // Le prochain passage en ligne retentera naturellement.
        }
      }
    })(),
  );
});
