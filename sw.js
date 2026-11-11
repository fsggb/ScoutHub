/* ScoutHub : cache des gros fichiers des applications (WebAssembly, JavaScript compilé).
 * Ces fichiers portent un nom qui change à chaque version (empreinte dans le nom) : on peut les garder sans risque.
 * Première ouverture d'une application : téléchargement normal ; ensuite : instantané, tant que la version ne change pas. */
const CACHE = "scouthub-assets-v1", MAX = 40;
const IMMUTABLE = /\/[\w.-]+-[0-9a-f]{8,}(_bg)?\.(wasm|js|css)$/;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("scouthub-assets-") && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || !IMMUTABLE.test(u.pathname)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE), hit = await c.match(r);
    if (hit) return hit;
    const res = await fetch(r);
    if (res.ok && res.status === 200) {
      c.put(r, res.clone()).then(async () => { const keys = await c.keys(); for (const k of keys.slice(0, Math.max(0, keys.length - MAX))) await c.delete(k); }).catch(() => {});
    }
    return res;
  })());
});
