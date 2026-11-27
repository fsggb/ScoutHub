// ---------- Liens courts Google Maps (maps.app.goo.gl…) : l'adresse complète est lue ici, car un navigateur ne peut pas la lire lui-même ----------
// Seules les adresses de Google Maps sont suivies (liste blanche à chaque redirection), 6 redirections au plus ; seules les pages du site appellent.
const HOTES_MAPS = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|maps\.google\.[a-z.]{2,6}|www\.google\.[a-z.]{2,6}|google\.[a-z.]{2,6}|consent\.google\.com)$/;
export async function lienCourt(req, env, url) {
  const rep = (s, o) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "cache-control": "public, max-age=3600" } });
  const ref = req.headers.get("Referer") || req.headers.get("Origin") || "", ok = String(env.ORIGINES || "").split(",").map(x => x.trim()).filter(Boolean).concat(["http://localhost", "http://127.0.0.1"]);
  if (!ok.some(o => ref === o || ref.startsWith(o + "/") || ref.startsWith(o + ":"))) return rep(403, { erreur: "Réservé aux applications de ScoutHub." });
  let cur; try { cur = new URL(url.searchParams.get("u") || ""); } catch { return rep(400, { erreur: "Adresse illisible." }); }
  for (let i = 0; i < 6; i++) {
    if (cur.protocol !== "https:" || !HOTES_MAPS.test(cur.hostname)) return rep(400, { erreur: "Seuls les liens Google Maps sont acceptés." });
    // l'adresse suffit déjà ?
    if (/[@!]\d|[?&](q|ll|query|center|destination)=-?\d/.test(cur.href) || /\/maps\/place\//.test(cur.href)) return rep(200, { url: cur.href });
    if (cur.hostname === "consent.google.com" && cur.searchParams.get("continue")) { try { cur = new URL(cur.searchParams.get("continue")); continue; } catch { return rep(502, { erreur: "Redirection illisible." }); } }
    let r; try { r = await fetch(cur.href, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (compatible; ScoutHub)", "Accept-Language": "fr", "Cookie": "CONSENT=YES+cb" } }); } catch { return rep(502, { erreur: "Google Maps ne répond pas." }); }
    const loc = r.headers.get("Location");
    if (r.status >= 300 && r.status < 400 && loc) { try { cur = new URL(loc, cur.href); } catch { return rep(502, { erreur: "Redirection illisible." }); } continue; }
    return rep(200, { url: cur.href });
  }
  return rep(200, { url: cur.href });
}
