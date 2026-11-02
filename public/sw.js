// Service worker: makes the app work offline after the first visit.
// - Page navigations: network first, falling back to the cached app shell.
// - Hashed build assets and stroke data never change: cache first.
// - Vocabulary files may change between deploys: serve cached, refresh in the background.
// Bump VERSION to drop old caches after changing this strategy.
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const STATIC = `static-${VERSION}`;
const scope = new URL(self.registration.scope);
const INDEX = new URL('index.html', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([INDEX, new URL('manifest.webmanifest', scope).href, new URL('icon.svg', scope).href]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(SHELL)).put(INDEX, response.clone());
    return response;
  } catch {
    return (await caches.match(INDEX)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, event) {
  const cached = await caches.match(request);
  const refresh = fetch(request).then(async (response) => {
    if (response.ok) await (await caches.open(STATIC)).put(request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only handle this site's GET requests (Supabase, analytics etc. pass through).
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname.slice(scope.pathname.length);

  if (request.mode === 'navigate') event.respondWith(networkFirstPage(request));
  else if (path.startsWith('assets/') || path.startsWith('char-data/')) event.respondWith(cacheFirst(request));
  else if (path.startsWith('vocab/') || /^(icon|apple-touch-icon)/.test(path)) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
