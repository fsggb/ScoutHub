// Configuration de ChatGDB servie par Cloudflare (sans Apps Script) : crédits et paramètres de la conversation.
// L'identité est celle de la connexion unique ; le jeton remis au navigateur est celui du relais (/chat), signé avec RELAIS_SECRET.
import { quiEstCe } from "./auth.js";
import { etatCredits, MODELES } from "./chatgdb.js";
import { OUTILS_BASE, OUTIL_IMAGE } from "./chatgdb-outils.js";
import { FIXE, AUTONOMIE, VIGILANCE, CHARTE, PRIORITE, APPS, APPROF, STANDARD } from "./chatgdb-prompt.js";

const enc = new TextEncoder();
const b64url = s => btoa(String.fromCharCode(...enc.encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const NOMS = { "claude-haiku-5-5": "Haiku 5.5", "claude-sonnet-5-5": "Sonnet 5.5", "claude-opus-5-5": "Opus 5.5" };
const WEB = { "claude-haiku-5-5": "20250305", "claude-sonnet-5-5": "20260209", "claude-opus-5-5": "20260209" };
const MODELE_DEFAUT = "claude-haiku-5-5";

async function jetonRelais(env, email, role) {
  const charge = b64url(JSON.stringify({ e: email, r: role, b: 0, x: Date.now() + 15 * 60 * 1000 }));
  const cle = await crypto.subtle.importKey("raw", enc.encode(env.RELAIS_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return charge + "." + hex(await crypto.subtle.sign("HMAC", cle, enc.encode(charge)));
}
export async function chatgdbConfig(req, env, url, json, erreur) {
  const r = await req.json().catch(() => ({}));
  let qui; try { qui = await quiEstCe(env, r.token); } catch (e) { return erreur(e && e.code || 401, "Session expirée : reconnectez-vous."); }
  if (!env.RELAIS_SECRET) return erreur(503, "ChatGDB n'est pas configuré (relais).");
  const admin = qui.r === "admin";
  if (url.pathname === "/chatgdb/credits") {
    return json(200, { ok: true, chat: true, raison: "", voix: false, modeles: Object.keys(MODELES).filter(id => admin || !/opus/.test(id)).map(id => ({ id, nom: NOMS[id] || id })), role: qui.r, email: qui.e, admin, rapide: true, credits: await etatCredits(env, qui) });
  }
  // /chatgdb/rapide : paramètres de la conversation
  const modele = MODELES[r.modele] && (admin || !/opus/.test(r.modele)) ? r.modele : MODELE_DEFAUT, approfondie = r.profondeur === "approfondie";
  // [partie fixe (mise en cache chez Claude), partie variable] : le navigateur envoie les deux, la première avec cache_control.
  const apps = Array.isArray(r.apps) ? r.apps.slice(0, 40).map(n => String(n).replace(/[^\w À-ÿ.+-]/g, "").slice(0, 40)).filter(Boolean) : [];
  const variable = [AUTONOMIE, VIGILANCE, admin ? PRIORITE : CHARTE,
    r.custom ? "Préférences de l'utilisateur et consignes de l'interface (à respecter sauf si elles contredisent ce qui précède) : " + String(r.custom).slice(0, 14000) : "",
    r.style === "detail" ? "Style demandé : réponses détaillées et structurées." : "Style demandé : réponses courtes.",
    approfondie ? APPROF : STANDARD, apps.length ? APPS : ""].filter(Boolean).join("\n\n");
  const systeme = [FIXE, variable];
  const outils = OUTILS_BASE.concat(r.web === false ? [] : [OUTIL_IMAGE,
    { type: "web_search_" + WEB[modele], name: "web_search", max_uses: approfondie ? 12 : 4, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } },
    { type: "web_fetch_" + (WEB[modele] === "20260209" ? "20260209" : "20250910"), name: "web_fetch", max_uses: approfondie ? 8 : 3 }]);
  if (apps.length) outils.push({ name: "application", description: "Ouvre et manipule une application de ScoutHub dans le volet d'artefact (décrit par la page).", input_schema: { type: "object", properties: {} } });
  return json(200, { ok: true, relais: "https://scouthub.fsggb.workers.dev/chat", jeton: await jetonRelais(env, qui.e, qui.r), modele, jetons: approfondie ? 16000 : 8000, systeme, outils, version: "2023-06-01" });
}
