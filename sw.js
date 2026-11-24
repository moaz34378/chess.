// Offline support: pre-cache the whole app (incl. the Stockfish engine) at install, then cache-first.
const CACHE = 'kotb-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './NOTICE.txt',
  './engine/stockfish-19-lite-single.js', './engine/stockfish-19-lite-single.wasm', './engine/LICENSE-Stockfish-GPL-3.0.txt'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    // discover the hashed bundle files referenced by index.html
    const html = await (await c.match('./index.html')).text();
    const urls = [...html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)].map((m) => m[1]).filter((u) => !CORE.includes(u));
    await Promise.all(urls.map((u) => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r; } catch (err) { return (await c.match('./index.html')) || Response.error(); }
  })());
});
