// ---------- Relais des cartes IGN (ScoutMap) ----------
// Les images de carte ne peuvent pas porter de jeton : l'accès est limité aux pages du site (en-tête Referer),
// aux niveaux de zoom utiles et à la France (large) ; chaque tuile est gardée 30 jours dans le cache de Cloudflare.
const COUCHES_IGN = ["GEOGRAPHICALGRIDSYSTEMS.MAPS", "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR", "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR.CV", "GEOGRAPHICALGRIDSYSTEMS.MAPS.BDUNI.J1"];
export async function tuileIgn(req, env, ctx, url) {
  const m = url.pathname.match(/^\/(?:ign|scan25)\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})(?:\.jpg)?$/);
  const refus = (s, t) => new Response(t, { status: s, headers: { "content-type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  if (!m) return refus(404, "Tuile inconnue.");
  const z = +m[1], x = +m[2], y = +m[3];
  if (z < 6 || z > 18 || x >= 2 ** z || y >= 2 ** z) return refus(400, "Niveau de zoom hors limites.");
  // Pages autorisées : le site, et le poste de développement (localhost) pour les essais
  const ref = req.headers.get("Referer") || req.headers.get("Origin") || "", ok = String(env.ORIGINES || "").split(",").map(s => s.trim()).filter(Boolean).concat(["http://localhost", "http://127.0.0.1"]);
  if (!ok.some(o => ref === o || ref.startsWith(o + "/") || ref.startsWith(o + ":"))) return refus(403, "Carte réservée aux applications de ScoutHub.");
  const couche = COUCHES_IGN.includes(url.searchParams.get("couche")) ? url.searchParams.get("couche") : "";
  const cache = caches.default, cleCache = new Request("https://cache.scouthub/ign/" + (couche ? couche + "/" : "") + z + "/" + x + "/" + y + ".jpg");
  let res = await cache.match(cleCache);
  if (!res) {
    const cle = env.IGN_SCAN25_KEY && typeof env.IGN_SCAN25_KEY.get === "function" ? await env.IGN_SCAN25_KEY.get() : env.IGN_SCAN25_KEY;
    if (!cle) return refus(503, "Clé IGN absente.");
    const nom = couche || env.IGN_COUCHE || "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR", k = encodeURIComponent(cle);
    // Deux adresses IGN (WMTS puis TMS) : si la première est en panne, la seconde prend le relais
    const sources = [
      "https://data.geopf.fr/private/wmts?apikey=" + k + "&SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=" + encodeURIComponent(nom) + "&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX=" + z + "&TILEROW=" + y + "&TILECOL=" + x,
      "https://data.geopf.fr/private/tms/1.0.0/" + encodeURIComponent(nom) + "/" + z + "/" + x + "/" + y + ".jpeg?apikey=" + k
    ];
    let amont = null;
    for (const src of sources) { try { amont = await fetch(src, { headers: { "User-Agent": "ScoutHub-FSGGB" } }); if (amont.ok) break; } catch { amont = null; } }
    if (!amont) return refus(502, "IGN injoignable.");
    if (!amont.ok) { const detail = (await amont.text()).replace(/<[^>]+>/g, " ").replace(/apikey=[^&\s]*/gi, "apikey=…").replace(/\s+/g, " ").trim().slice(0, 160); return refus(amont.status === 404 ? 404 : 502, "Tuile IGN indisponible (" + amont.status + ") : " + detail); }
    res = new Response(amont.body, { status: 200, headers: { "content-type": amont.headers.get("content-type") || "image/jpeg", "cache-control": "public, max-age=2592000", "Access-Control-Allow-Origin": "*" } });
    ctx.waitUntil(cache.put(cleCache, res.clone()));
  }
  return res;
}
