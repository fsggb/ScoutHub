// ---------- Détection de parole et filtre des hallucinations de Whisper ----------
// Partagé par chatgdb.js (/dictee, tous les comptes) et laboratoire.js (/ia/dictee, administrateur) : Whisper
// « invente » du texte sur du silence ou du bruit (« Sous-titrage… », « Merci. ») et son détecteur de voix ne
// l'empêche pas : on mesure donc nous-mêmes la parole dans le WAV (PCM 16 bits mono) avant de l'envoyer.
// Renvoie les secondes de parole (images de 20 ms au-dessus de 1,2 % d'amplitude).
export function paroleWav(b64) {
  try {
    if (atob(b64.slice(0, 16)).slice(0, 4) !== "RIFF" || atob(b64.slice(8, 16).padEnd(8, "=")).length < 0) return null;
    const o = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), dv = new DataView(o.buffer);
    if (String.fromCharCode(o[8], o[9], o[10], o[11]) !== "WAVE") return null;
    const taux = dv.getUint32(24, true); let i = 12, debut = -1, fin = 0;
    while (i + 8 <= o.length) { const nom = String.fromCharCode(o[i], o[i + 1], o[i + 2], o[i + 3]), n = dv.getUint32(i + 4, true); if (nom === "data") { debut = i + 8; fin = Math.min(o.length, debut + n); break; } i += 8 + n + (n & 1); }
    if (debut < 0 || dv.getUint16(22, true) !== 1 || dv.getUint16(34, true) !== 16 || !taux) return null;
    const image = Math.max(1, Math.round(taux * 0.02)); let voix = 0;
    for (let a = debut; a + image * 2 <= fin; a += image * 2) { let somme = 0; for (let k = 0; k < image; k++) { const v = dv.getInt16(a + k * 2, true) / 32768; somme += v * v; } if (Math.sqrt(somme / image) > 0.012) voix += 0.02; }
    return voix;
  } catch { return null; }
}
export const HALLUCINATION = /^(sous-?titr\w*.*|merci\.?|merci (beaucoup|à tous)\.?|merci d['’]avoir regard\w+.*|amara\.org.*|abonnez-vous.*|à bientôt\.?|st['’]? ?\d+.*)$/i;
