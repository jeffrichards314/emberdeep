/* EMBERDEEP service worker: once the game has been opened online it opens offline too (and installs as an app).
 * Network first, so a new version always wins when there is a connection; the cache is only the fallback.
 * Bump VERSION to drop everything cached by an older worker.  The versions/ snapshots are never cached. */
'use strict';
const VERSION = 'emberdeep-1';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const html = await (await fetch('index.html', { cache: 'reload' })).text();
    const files = new Set(['./', 'index.html']);
    for (const m of html.matchAll(/(?:src|href)="([^":#?]+)"/g)) files.add(m[1]);       // every script, icon and the manifest the page names
    try { for (const i of (await (await fetch('manifest.webmanifest')).json()).icons || []) files.add(i.src); } catch (e) { /* the manifest's own icons are a bonus */ }
    await Promise.all([...files].map((f) => cache.add(new Request(f, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || /\/versions\//.test(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('index.html') : null);
      if (hit) return hit;
      throw e;
    }
  })());
});
