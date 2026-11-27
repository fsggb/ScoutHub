// ---------- LABORATOIRE (administrateur) : modèles Workers AI gratuits, dictée, voix, recherche par le sens ----------
// /ia/modeles  catalogue (prix en Neurons par million de jetons) et compteur du jour
// /ia/chat     un modèle de texte (messages, outils, température) : réponse complète + durée + Neurons
// /ia/dictee   audio (base64) -> texte (Whisper)      /ia/voix  texte -> audio (MeloTTS)      /ia/vecteurs  textes -> vecteurs (bge-m3)
// Le budget gratuit est de 10 000 Neurons par jour pour tout le compte (remise à zéro à 00 h UTC) : au-delà de 80 %, les essais sont
// refusés sauf demande explicite (force) de l'administrateur ; le décompte est tenu dans D1 (table neurons, commun.js).
import { neuronsJour, neuronsAjouter, NEURONS_PAR_MINUTE } from "./commun.js";
import { paroleWav, HALLUCINATION } from "./voix.js";

const TEXTE_IA = {
  "@cf/meta/llama-3.1-8b-instruct-fp8-fast": ["Llama 3.1 8B (rapide)", 4119, 34868],
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": ["Llama 3.3 70B (rapide)", 26668, 204805],
  "@cf/meta/llama-4-scout-17b-16e-instruct": ["Llama 4 Scout 17B", 24545, 77273],
  "@cf/qwen/qwen3-30b-a3b-fp8": ["Qwen3 30B-A3B", 4625, 30475],
  "@cf/openai/gpt-oss-120b": ["GPT-OSS 120B", 31818, 68182],
  "@cf/openai/gpt-oss-20b": ["GPT-OSS 20B", 18182, 27273],
  "@cf/mistralai/mistral-small-3.1-24b-instruct": ["Mistral Small 3.1 24B", 31876, 50488],
  "@cf/google/gemma-4-26b-a4b-it": ["Gemma 4 26B-A4B", 9091, 27273],
  "@cf/zai-org/glm-4.7-flash": ["GLM-4.7-Flash", 5500, 36400],
  "@cf/nvidia/nemotron-3-120b-a12b": ["Nemotron 3 120B", 45455, 136364],
  "@cf/qwen/qwen3.8-27b": ["Qwen3.8 27B", 40909, 290909],
  "@cf/ibm-granite/granite-4.0-h-micro": ["Granite 4.0 micro", 1542, 10158]
};
const NEURONS_VECTEUR_PAR_JETON = 0.001075;
const MAX_AUDIO = 6e6, MAX_TEXTE_IA = 60000;

// ---------- GÉNÉRATION D'IMAGES (Workers AI) ----------
// Claude ne génère pas d'images (il les lit et les décrit). Les modèles d'images disponibles sur le compte sont ceux de Workers AI.
// Tarifs en Neurons : estimés d'après les prix publics (1 Neuron = 0,000011 $), affichés comme estimation. mode : json = {image: base64},
// binaire = flux PNG/JPEG, multipart = formulaire (FLUX.2). tuiles = nombre de carrés de 512 px de l'image produite.
const tuiles = (l, h) => Math.ceil(l / 512) * Math.ceil(h / 512), NEURON_USD = 0.000011;
const IMAGES_IA = {
  "@cf/black-forest-labs/flux-1-schnell": { nom: "FLUX.1 schnell (rapide, très bon)", mode: "json", taille: false, l: 1024, h: 1024, pas: [4, 8], neurons: (l, h, p) => (tuiles(1024, 1024) * 0.0000528 + p * 0.0001) / NEURON_USD },
  "@cf/black-forest-labs/flux-2-klein-4b": { nom: "FLUX.2 klein 4B (rapide, détaillé)", mode: "multipart", taille: true, l: 1024, h: 768, max: 2048, pas: [4, 8], neurons: (l, h) => tuiles(l, h) * 0.000287 / NEURON_USD },
  "@cf/black-forest-labs/flux-2-klein-9b": { nom: "FLUX.2 klein 9B (qualité)", mode: "multipart", taille: true, l: 1024, h: 768, max: 2048, pas: [4, 8], neurons: (l, h) => tuiles(l, h) * 0.00033 / NEURON_USD },
  "@cf/black-forest-labs/flux-2-dev": { nom: "FLUX.2 dev (meilleure qualité, plus lent)", mode: "multipart", taille: true, l: 1024, h: 768, max: 2048, pas: [20, 50], neurons: (l, h) => tuiles(l, h) * 0.00041 / NEURON_USD },
  "@cf/leonardo/phoenix-1.0": { nom: "Leonardo Phoenix 1.0 (texte dans l'image)", mode: "binaire", taille: true, l: 1024, h: 1024, max: 2048, pas: [25, 50], neg: true, guidance: [2, 10, 2], neurons: (l, h, p) => (tuiles(l, h) * 0.00583 + p * 0.00011) / NEURON_USD },
  "@cf/leonardo/lucid-origin": { nom: "Leonardo Lucid Origin (réalisme)", mode: "json", taille: true, l: 1120, h: 1120, max: 2500, pas: [20, 40], guidance: [0, 10, 4.5], neurons: (l, h, p) => (tuiles(l, h) * 0.007 + p * 0.000132) / NEURON_USD },
  "@cf/bytedance/stable-diffusion-xl-lightning": { nom: "SDXL Lightning (bêta, très rapide)", mode: "binaire", taille: true, l: 1024, h: 1024, max: 2048, pas: [4, 20], neg: true, guidance: [0, 10, 1.5], neurons: () => 2 },
  "@cf/stabilityai/stable-diffusion-xl-base-1.0": { nom: "Stable Diffusion XL base (bêta)", mode: "binaire", taille: true, l: 1024, h: 1024, max: 2048, pas: [20, 20], neg: true, guidance: [0, 20, 7.5], neurons: () => 2 },
  "@cf/lykon/dreamshaper-8-lcm": { nom: "DreamShaper 8 LCM (rapide, simple)", mode: "binaire", taille: true, l: 768, h: 768, max: 2048, pas: [8, 20], neg: true, guidance: [0, 20, 7.5], neurons: () => 2 }
};
const borne = (v, mini, maxi, def) => { v = +v; return isFinite(v) ? Math.min(Math.max(v, mini), maxi) : def; };
function versBase64(octets) { let b = ""; const u = new Uint8Array(octets); for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(b); }
async function genererImage(env, id, c) {
  const m = IMAGES_IA[id]; const prompt = String(c.prompt || "").trim().slice(0, 2000); if (!prompt) throw Object.assign(new Error("Décrivez l'image à générer."), { statut: 400 });
  const l = m.taille ? Math.round(borne(c.largeur, 256, m.max, m.l) / 16) * 16 : 1024, h = m.taille ? Math.round(borne(c.hauteur, 256, m.max, m.h) / 16) * 16 : 1024, p = Math.round(borne(c.pas, 1, m.pas[1], m.pas[0]));
  const seed = c.seed != null && c.seed !== "" && isFinite(+c.seed) ? Math.max(0, Math.round(+c.seed)) : null, negatif = String(c.negatif || "").slice(0, 500);
  let r;
  if (m.mode === "multipart") {
    const f = new FormData(); f.append("prompt", prompt); f.append("width", String(l)); f.append("height", String(h)); f.append("steps", String(p)); if (seed !== null) f.append("seed", String(seed));
    const rep = new Response(f); r = await env.AI.run(id, { multipart: { body: rep.body, contentType: rep.headers.get("content-type") } });
  } else if (m.mode === "json" && !m.taille) r = await env.AI.run(id, { prompt, steps: p, ...(seed !== null ? { seed } : {}) });
  else {
    const g = m.guidance; const corps = { prompt, ...(g ? { guidance: borne(c.guidance, g[0], g[1], g[2]) } : {}), ...(seed !== null ? { seed } : {}) };
    if (m.mode === "binaire" && /dreamshaper|stable-diffusion/.test(id)) Object.assign(corps, { width: l, height: h, num_steps: p, ...(negatif ? { negative_prompt: negatif } : {}) });
    else Object.assign(corps, { width: l, height: h, num_steps: p, steps: p, ...(negatif && m.neg ? { negative_prompt: negatif } : {}) });
    r = await env.AI.run(id, corps);
  }
  let b64, mime;
  if (r && typeof r === "object" && typeof r.image === "string") { b64 = r.image; mime = b64.startsWith("iVBOR") ? "image/png" : "image/jpeg"; }
  else { const tampon = await new Response(r).arrayBuffer(); const o = new Uint8Array(tampon); mime = o[0] === 0x89 ? "image/png" : "image/jpeg"; b64 = versBase64(tampon); }
  return { b64, mime, l, h, p, neurons: Math.round(m.neurons(l, h, p) * 10) / 10 };
}

export async function laboratoire(req, env, url, json, erreur) {
  const etat = await neuronsJour(env);
  const chemin = url.pathname.slice(3);
  if (chemin === "/modeles") return json(200, { ok: true, etat, modeles: Object.entries(TEXTE_IA).map(([id, [nom, e, so]]) => ({ id, nom, entree: e, sortie: so })), images: Object.entries(IMAGES_IA).map(([id, m]) => ({ id, nom: m.nom, mode: m.mode, taille: m.taille, largeur: m.l, hauteur: m.h, max: m.max || 1024, pas: m.pas, negatif: !!m.neg, guidance: m.guidance || null, neurons: Math.round(m.neurons(m.l, m.h, m.pas[0])) })), dictee: "@cf/openai/whisper-large-v3-turbo", voix: "@cf/myshell-ai/melotts", vecteurs: "@cf/baai/bge-m3" });
  let c; try { c = await req.json(); } catch { return erreur(400, "Requête invalide."); }
  if (!c.force && etat.utilises >= etat.budget * etat.coupure) return erreur(429, "Budget gratuit du jour entamé à plus de 80 % (" + etat.utilises + " / " + etat.budget + " Neurons) : réessayez demain (00 h UTC) ou forcez l'essai.");
  const t0 = Date.now();
  try {
    if (chemin === "/chat") {
      const m = TEXTE_IA[c.model]; if (!m) return erreur(400, "Modèle non autorisé.");
      if (!Array.isArray(c.messages) || !c.messages.length || JSON.stringify(c.messages).length > MAX_TEXTE_IA) return erreur(400, "Messages invalides ou trop longs.");
      const corps = { messages: c.messages, max_tokens: Math.min(Math.max(+c.max_tokens || 800, 16), 8000), temperature: Math.min(Math.max(+c.temperature || 0, 0), 2) };
      if (Array.isArray(c.tools) && c.tools.length) corps.tools = c.tools.slice(0, 20);
      const r = await env.AI.run(c.model, corps);
      const ch = r && r.choices && r.choices[0] && r.choices[0].message || {}, u = r && r.usage || {};
      const entree = u.prompt_tokens || 0, sortie = u.completion_tokens || 0, neurons = (entree * m[1] + sortie * m[2]) / 1e6;
      await neuronsAjouter(env, neurons);
      return json(200, { ok: true, modele: c.model, nom: m[0], texte: (ch.content != null ? ch.content : r && r.response) || "", raisonnement: ch.reasoning || ch.reasoning_content || "", outils: ch.tool_calls || [], entree, sortie, neurons: Math.round(neurons * 100) / 100, ms: Date.now() - t0, restant: Math.round((etat.budget - etat.utilises - neurons) * 10) / 10 });
    }
    if (chemin === "/dictee") {
      const audio = String(c.audio || ""); if (!audio || audio.length > MAX_AUDIO) return erreur(400, "Audio absent ou trop long (6 Mo au plus).");
      const voix = paroleWav(audio); if (voix !== null && voix < 0.2) return json(200, { ok: true, texte: "", silence: true, mots: 0, duree: 0, neurons: 0, ms: Date.now() - t0 });      // pas de parole : rien n'est envoyé à Whisper
      const r = await env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio, language: /^[a-z]{2}$/.test(c.langue) ? c.langue : "fr" });
      const duree = +(r && r.transcription_info && r.transcription_info.duration) || +c.duree || 0, neurons = duree / 60 * NEURONS_PAR_MINUTE.dictee;
      await neuronsAjouter(env, neurons);
      let texteLab = String(r && r.text || "").trim(); if (HALLUCINATION.test(texteLab) && (voix === null || voix < 1.2)) texteLab = "";
      return json(200, { ok: true, texte: texteLab, mots: r && r.words ? r.words.length : 0, duree, neurons: Math.round(neurons * 100) / 100, ms: Date.now() - t0 });
    }
    if (chemin === "/image") {
      const m = IMAGES_IA[c.model]; if (!m) return erreur(400, "Modèle d'image non autorisé.");
      const prevu = m.neurons(m.taille ? borne(c.largeur, 256, m.max, m.l) : 1024, m.taille ? borne(c.hauteur, 256, m.max, m.h) : 1024, borne(c.pas, 1, m.pas[1], m.pas[0]));
      if (prevu > etat.budget * 0.15 && !c.confirmer) return erreur(409, "Cette image coûterait environ " + Math.round(prevu) + " Neurons (" + Math.round(prevu / etat.budget * 100) + " % du budget du jour) : cochez « Confirmer le coût » pour la générer.");
      if (!c.force && etat.utilises + prevu > etat.budget * etat.coupure) return erreur(429, "Cette image (≈ " + Math.round(prevu) + " Neurons) dépasserait 80 % du budget du jour : forcez l'essai ou réessayez demain.");
      let g; try { g = await genererImage(env, c.model, c); } catch (e) { if (e && e.statut) return erreur(e.statut, e.message); throw e; }
      await neuronsAjouter(env, g.neurons);
      return json(200, { ok: true, modele: c.model, nom: m.nom, image: g.b64, mime: g.mime, largeur: g.l, hauteur: g.h, pas: g.p, neurons: g.neurons, estime: true, ms: Date.now() - t0 });
    }
    if (chemin === "/voix") {
      const texte = String(c.texte || "").slice(0, 2000); if (!texte) return erreur(400, "Texte absent.");
      const r = await env.AI.run("@cf/myshell-ai/melotts", { prompt: texte, lang: /^[a-z]{2}$/.test(c.langue) ? c.langue : "fr" });
      const neurons = texte.length / 14 / 60 * NEURONS_PAR_MINUTE.voix;
      await neuronsAjouter(env, neurons);
      return json(200, { ok: true, audio: r && r.audio || "", neurons: Math.round(neurons * 100) / 100, ms: Date.now() - t0 });
    }
    if (chemin === "/vecteurs") {
      const textes = Array.isArray(c.textes) ? c.textes.map(t => String(t).slice(0, 4000)).slice(0, 100) : [];
      if (!textes.length) return erreur(400, "Textes absents.");
      const r = await env.AI.run("@cf/baai/bge-m3", { text: textes });
      const neurons = textes.reduce((n, t) => n + t.length / 3, 0) * NEURONS_VECTEUR_PAR_JETON;
      await neuronsAjouter(env, neurons);
      return json(200, { ok: true, vecteurs: r && r.data || [], neurons: Math.round(neurons * 100) / 100, ms: Date.now() - t0 });
    }
  } catch (e) {
    return erreur(502, "Workers AI : " + String(e && e.message || e).slice(0, 300));
  }
  return erreur(404, "Adresse inconnue.");
}
