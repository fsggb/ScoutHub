// ---------- Aides partagées par tous les modules du Worker (crypto, CORS, budget quotidien Workers AI) ----------
export const enc = new TextEncoder();
export const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
export const b64url = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

export function cors(env, origine) {
  const ok = String(env.ORIGINES || "").split(",").map(s => s.trim()).filter(Boolean);
  return {
    "Access-Control-Allow-Origin": ok.includes(origine) ? origine : ok[0] || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-scouthub-jeton",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

export const jourUtc = () => new Date().toISOString().slice(0, 10);

// Budget gratuit Workers AI (10 000 Neurons/jour pour tout le compte, remise à zéro à 00 h UTC) : compté dans D1
// (table neurons), partagé par le laboratoire de l'administrateur (/ia/*) et la dictée de tous (/dictee).
let tablesPretes = false;
export async function neuronsJour(env) {
  if (!tablesPretes) await env.DB.prepare("CREATE TABLE IF NOT EXISTS neurons (jour TEXT PRIMARY KEY, n REAL NOT NULL DEFAULT 0, appels INTEGER NOT NULL DEFAULT 0)").run().then(() => { tablesPretes = true; });
  const r = await env.DB.prepare("SELECT n, appels FROM neurons WHERE jour = ?").bind(jourUtc()).first();
  return { jour: jourUtc(), utilises: Math.round((r && r.n || 0) * 10) / 10, appels: r ? r.appels : 0, budget: +env.NEURONS_JOUR || 10000, coupure: 0.8 };
}
export async function neuronsAjouter(env, n) {
  await env.DB.prepare("INSERT INTO neurons (jour, n, appels) VALUES (?, ?, 1) ON CONFLICT(jour) DO UPDATE SET n = n + excluded.n, appels = appels + 1").bind(jourUtc(), n).run();
}
