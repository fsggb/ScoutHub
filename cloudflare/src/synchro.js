// Demande à GitHub de lancer le workflow de synchronisation (clé « GITHUB_KEY » : droit « Actions : lecture et écriture » sur le dépôt fsggb/ScoutHub)
// Déclenché toutes les 15 minutes (wrangler.jsonc, triggers.crons) pour que les nouvelles versions des applications
// (Word, Excel, CADCraft…) soient repérées et publiées rapidement, plus vite que le planificateur de GitHub seul
// (qui espace ses exécutions, parfois plus de 6 heures). Le workflow ne redéploie que si une version a changé.
export async function lancerSynchro(env) {
  try {
    const cle = env.GITHUB_KEY && typeof env.GITHUB_KEY.get === "function" ? await env.GITHUB_KEY.get() : env.GITHUB_KEY;
    if (!cle) { console.log("synchro : clé GitHub absente"); return; }
    const r = await fetch("https://api.github.com/repos/fsggb/ScoutHub/actions/workflows/sync.yml/dispatches", { method: "POST",
      headers: { authorization: "Bearer " + cle, accept: "application/vnd.github+json", "user-agent": "scouthub-synchro", "x-github-api-version": "2022-11-28", "content-type": "application/json" }, body: JSON.stringify({ ref: "main" }) });
    console.log("synchro : GitHub répond " + r.status + (r.status === 204 ? " (workflow lancé)" : " : " + (await r.text()).slice(0, 200) + (r.status === 403 || r.status === 404 ? " → la clé GITHUB_KEY n'a pas le droit « Actions : écriture » sur fsggb/ScoutHub" : "")));
  } catch (e) { console.log("synchro : erreur " + (e && e.message || e)); }
}
