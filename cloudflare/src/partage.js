// ---------- Partage en direct (Durable Object : un objet par partage, connexions WebSocket en hibernation) ----------
import { enc, hex } from "./commun.js";
const sha = async t => hex(await crypto.subtle.digest("SHA-256", enc.encode(String(t))));
const MAX_CHAT = 250, MAX_CARTE = 1500000, DUREE_VIE = 3 * 86400000;
// Fichiers de la discussion (photos, messages vocaux, documents) : déjà chiffrés par le navigateur, gardés dans le stockage du partage
// (supprimés avec lui) ; un message WebSocket fait au plus 1 Mo, d'où cette limite ; les plus anciens sont effacés au-delà de MAX_MEDIAS.
const MAX_MEDIA = 950000, MAX_MEDIAS = 60;
export class Partage {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("WebSocket attendu.", { status: 426 });
    const paire = new WebSocketPair(); this.state.acceptWebSocket(paire[1]);
    return new Response(null, { status: 101, webSocket: paire[0] });
  }
  async lire() {
    try {
      const s = this.state.storage, v = await s.get(["owner", "admtok", "carte", "carteT", "chat", "closed", "verrou"]);
      return { owner: v.get("owner") || null, admtok: v.get("admtok") || null, carte: v.get("carte") || null, carteT: v.get("carteT") || 0, chat: v.get("chat") || [], closed: !!v.get("closed"), verrou: !!v.get("verrou") };
    } catch (e) { return { owner: null, admtok: null, carte: null, carteT: 0, chat: [], closed: false, ko: true }; }
  }
  // Écriture qui ne bloque jamais la diffusion : si le stockage refuse (quota du jour, erreur), les messages passent quand même en direct
  async ecrire(cle, valeur) { try { await this.state.storage.put(cle, valeur); return true; } catch (e) { return false; } }
  // Positions et signes de vie : gardés dans les connexions elles-mêmes (aucune écriture de stockage, donc pas de quota consommé)
  positions() { const o = {}; for (const w of this.state.getWebSockets()) { const i = w.deserializeAttachment() || {}; if (i.uid && i.pos) o[i.uid] = i.pos; } return o; }
  envoyer(ws, o) { try { ws.send(JSON.stringify(o)); } catch { /* fermé */ } }
  diffuser(o, sauf) { const t = JSON.stringify(o); for (const ws of this.state.getWebSockets()) if (ws !== sauf) { try { ws.send(t); } catch { /* fermé */ } } }
  // Serveurs STUN/TURN pour les appels : identifiants valables 24 h, gardés 6 h en mémoire ; à défaut, STUN seul (appel direct quand le réseau le permet)
  async serveursIce() {
    if (this.ice && Date.now() - this.ice.t < 6 * 3600e3) return this.ice.v;
    const stun = [{ urls: ["stun:stun.cloudflare.com:3478"] }], e = this.env;
    try {
      const jeton = e.TURN_KEY_TOKEN && typeof e.TURN_KEY_TOKEN.get === "function" ? await e.TURN_KEY_TOKEN.get() : e.TURN_KEY_TOKEN;
      if (!e.TURN_KEY_ID || !jeton) return stun;
      const r = await fetch("https://rtc.live.cloudflare.com/v1/turn/keys/" + encodeURIComponent(e.TURN_KEY_ID) + "/credentials/generate-ice-servers", { method: "POST", headers: { authorization: "Bearer " + jeton, "content-type": "application/json" }, body: JSON.stringify({ ttl: 86400 }) });
      if (!r.ok) return stun;
      const o = await r.json(); if (!Array.isArray(o.iceServers) || !o.iceServers.length) return stun;
      this.ice = { t: Date.now(), v: o.iceServers }; return o.iceServers;
    } catch { return stun; }
  }
  async vivant() { await this.state.storage.setAlarm(Date.now() + DUREE_VIE); }       // effacé 3 jours après la dernière activité
  async alarm() { await this.state.storage.deleteAll(); }
  async webSocketMessage(ws, brut) {
    try { await this.traiter(ws, brut); }
    catch (e) { this.envoyer(ws, { t: "erreur", m: "Erreur du serveur : " + String((e && e.message) || e).slice(0, 120) }); }
  }
  async traiter(ws, brut) {
    let m; try { m = JSON.parse(typeof brut === "string" ? brut : new TextDecoder().decode(brut)); } catch { return; }
    if (!m || typeof m.t !== "string" || String(brut).length > MAX_CARTE + 4000) return;
    if (m.t === "ping") return this.envoyer(ws, { t: "pong", c: m.c, maintenant: Date.now() });   // le navigateur mesure le délai et détecte une connexion morte
    const s = this.state.storage, moi = ws.deserializeAttachment() || {}, maintenant = Date.now();
    // Fichiers : dépôt (« media », avec accusé « ok ») et lecture à la demande (« getm » → « media »), réservés aux personnes connectées au partage
    if (moi.uid && m.t === "media") {
      if (!/^[a-z0-9]{8,24}$/.test(String(m.id || "")) || typeof m.d !== "string" || m.d.length > MAX_MEDIA) return this.envoyer(ws, { t: "erreur", r: "media", id: m.id, m: "Fichier refusé (trop lourd : 650 Ko au plus)." });
      try {
        await s.put("m:" + m.id, m.d);
        const idx = (await s.get("mi")) || []; if (idx.indexOf(m.id) < 0) idx.push(m.id);
        while (idx.length > MAX_MEDIAS) await s.delete("m:" + idx.shift());
        await s.put("mi", idx); await this.vivant().catch(() => {});
        return this.envoyer(ws, { t: "ok", r: "media", id: m.id });
      } catch (e) { return this.envoyer(ws, { t: "erreur", r: "media", id: m.id, m: "Fichier non enregistré (stockage du serveur indisponible ou plein)." }); }
    }
    if (moi.uid && m.t === "getm") {
      if (!/^[a-z0-9]{8,24}$/.test(String(m.id || ""))) return;
      let v = null; try { v = await s.get("m:" + m.id); } catch (e) { v = null; }
      return this.envoyer(ws, v ? { t: "media", id: m.id, d: v } : { t: "media", id: m.id, absent: true });
    }
    // Appels vocaux : messages de mise en relation (offres, réponses, candidats WebRTC) déjà chiffrés par le navigateur, simplement relayés ;
    // et identifiants TURN (Cloudflare Realtime) remis aux seules personnes connectées au partage.
    if (moi.uid && m.t === "sig" && typeof m.d === "string" && m.d.length <= 6000) return this.diffuser({ t: "sig", u: moi.uid, d: m.d }, ws);
    if (moi.uid && m.t === "turn") {
      if (maintenant - (moi.turnT || 0) < 15000) return this.envoyer(ws, { t: "turn", ice: [{ urls: ["stun:stun.cloudflare.com:3478"] }], limite: true });
      moi.turnT = maintenant; ws.serializeAttachment(moi);
      return this.envoyer(ws, { t: "turn", ice: await this.serveursIce() });
    }
    const chaine = (x, n) => typeof x === "string" && x.length <= n;
    if (m.t === "pos" && moi.uid && chaine(m.d, 1000)) { moi.pos = { d: m.d, at: maintenant }; ws.serializeAttachment(moi); return this.diffuser({ t: "pos", u: moi.uid, d: m.d, at: maintenant }); }
    if (m.t === "sanspos" && moi.uid) { delete moi.pos; ws.serializeAttachment(moi); return this.diffuser({ t: "sanspos", u: moi.uid }); }
    const d = await this.lire();
    if (m.t === "bonjour") {
      // uid : identifiant aléatoire de l'appareil ; proprio : secret du créateur ; adm : lien administrateur
      if (!chaine(m.uid, 40) || !m.uid) return this.envoyer(ws, { t: "erreur", m: "Identifiant manquant." });
      const info = { uid: m.uid, proprio: false, admin: false };
      if (d.ko && !m.creer) return this.envoyer(ws, { t: "erreur", m: "Stockage du serveur momentanément indisponible : réessayez dans un instant." });
      if (m.creer && !d.owner && chaine(m.proprio, 80)) { await s.put("owner", await sha(m.proprio)); await s.delete("closed"); await this.vivant(); info.proprio = info.admin = true; }
      else if (d.owner && chaine(m.proprio, 80) && await sha(m.proprio) === d.owner) info.proprio = info.admin = true;
      else if (!d.owner || d.closed) return this.envoyer(ws, { t: "absent" });
      if (!info.admin && chaine(m.adm, 60) && d.admtok && m.adm === d.admtok) info.admin = true;
      ws.serializeAttachment(info);
      const etat = await this.lire();
      return this.envoyer(ws, { t: "etat", proprio: info.proprio, admin: info.admin, admRefuse: !!(m.adm && !info.admin), maintenant, carte: etat.carte, carteT: etat.carteT, verrou: etat.verrou, chat: etat.chat, pos: this.positions() });
    }
    if (!moi.uid) return;
    if (m.t === "carte" && moi.admin && (moi.proprio || !d.verrou) && chaine(m.d, MAX_CARTE)) { const ok = await this.ecrire({ carte: m.d, carteT: maintenant }); if (ok) await this.vivant().catch(() => {}); else this.envoyer(ws, { t: "erreur", m: "La carte n'a pas pu être enregistrée (trop grande ou stockage plein) : elle est envoyée en direct, mais une personne qui arrive plus tard ne la verra pas." }); return this.diffuser({ t: "carte", d: m.d, at: maintenant }, ws); }
    if (m.t === "msg" && chaine(m.d, 6000)) { const k = maintenant.toString(36) + Math.random().toString(36).slice(2, 6); d.chat.push({ k, d: m.d, at: maintenant }); d.chat = d.chat.slice(-MAX_CHAT); while (d.chat.length > 20 && JSON.stringify(d.chat).length > 120000) d.chat.shift(); if (await this.ecrire("chat", d.chat)) await this.vivant().catch(() => {}); return this.diffuser({ t: "msg", k, d: m.d, at: maintenant }); }
    // Verrou : la personne qui dirige interdit (ou autorise de nouveau) la modification de la carte par les co-administrateurs ; annoncé à tout le monde
    if (m.t === "verrou" && moi.proprio) { const v = !!m.v; await s.put("verrou", v); this.diffuser({ t: "verrou", v }); return; }
    if (m.t === "carte" && moi.admin && !moi.proprio && d.verrou) return this.envoyer(ws, { t: "verrou", v: true, refus: true });
    if (m.t === "admtok" && moi.proprio && chaine(m.tk, 60) && m.tk.length >= 12) { await s.put("admtok", m.tk); return this.envoyer(ws, { t: "ok", r: "admtok" }); }
    if (m.t === "revoquer" && moi.proprio) {
      await s.delete("admtok");
      for (const w of this.state.getWebSockets()) { const i = w.deserializeAttachment() || {}; if (i.admin && !i.proprio) { i.admin = false; w.serializeAttachment(i); this.envoyer(w, { t: "revoque" }); } }
      return this.envoyer(ws, { t: "ok", r: "revoquer" });
    }
    if (m.t === "fin" && moi.proprio) { this.diffuser({ t: "fin" }, ws); await s.deleteAll(); await s.put("closed", true); await s.setAlarm(Date.now() + 86400000); return this.envoyer(ws, { t: "ok", r: "fin" }); }
  }
  async webSocketClose(ws) { this.depart(ws); try { ws.close(); } catch { /* déjà fermé */ } }
  async webSocketError(ws) { this.depart(ws); }
  depart(ws) {
    const i = ws.deserializeAttachment() || {};
    if (i.uid && !this.state.getWebSockets().some(w => w !== ws && (w.deserializeAttachment() || {}).uid === i.uid)) this.diffuser({ t: "sanspos", u: i.uid }, ws);
  }
}
export async function direct(req, env, url) {
  const id = url.pathname.slice(8);
  if (!/^[a-z0-9]{12,32}$/.test(id)) return new Response("Partage inconnu.", { status: 404 });
  const ok = String(env.ORIGINES || "").split(",").map(s => s.trim()).concat(["http://localhost", "http://127.0.0.1"]), o = req.headers.get("Origin") || "";
  if (!ok.some(x => o === x || o.startsWith(x + ":"))) return new Response("Origine refusée.", { status: 403 });
  return env.PARTAGE.get(env.PARTAGE.idFromName(id)).fetch(req);
}
