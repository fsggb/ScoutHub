// Page de connexion de l'intranet : la seule page (avec /_etat) servie sans session. Autonome (aucun fichier du
// portail : config.js contient les adresses des applications, qui ne doivent pas être servies avant la connexion).
// Les appels passent par le Worker lui-même (/_connexion/*), jamais directement par le navigateur vers le serveur d'identité.
export const pageConnexion = (clientId, retour) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Connexion · Intranet FSGGB</title>
<style>
:root{--fond:#f4f1ea;--carte:#fff;--texte:#1f2a37;--doux:#5b6675;--accent:#0b4f8a;--erreur:#b3261e;--ok:#1b6e3c;--bord:#d9d4c7}
@media (prefers-color-scheme:dark){:root{--fond:#14181f;--carte:#1d232c;--texte:#e8ecf1;--doux:#9aa6b5;--accent:#6fb1ee;--erreur:#ff8a80;--ok:#7bd89c;--bord:#323b48}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--fond);color:var(--texte);font:16px/1.5 system-ui,sans-serif;padding:16px}
main{width:100%;max-width:400px;background:var(--carte);border:1px solid var(--bord);border-radius:16px;padding:28px 24px;box-shadow:0 6px 24px #0001}
img{display:block;height:56px;margin:0 auto 12px}h1{font-size:1.25rem;text-align:center;margin:0 0 4px}p.s{color:var(--doux);text-align:center;margin:0 0 20px;font-size:.95rem}
label{display:block;font-size:.9rem;margin:14px 0 4px}input{width:100%;font:inherit;padding:11px 12px;border:1px solid var(--bord);border-radius:10px;background:transparent;color:inherit}
input:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
button.p{width:100%;margin-top:14px;padding:12px;font:inherit;font-weight:600;border:0;border-radius:10px;background:var(--accent);color:#fff;cursor:pointer}
@media (prefers-color-scheme:dark){button.p{color:#0b1220}}button.p:disabled{opacity:.6;cursor:wait}
.ou{display:flex;align-items:center;gap:10px;color:var(--doux);font-size:.85rem;margin:20px 0}.ou::before,.ou::after{content:"";flex:1;height:1px;background:var(--bord)}
#g{display:flex;justify-content:center;min-height:44px}#st{min-height:1.4em;margin:14px 0 0;font-size:.92rem;text-align:center}#st.e{color:var(--erreur)}#st.o{color:var(--ok)}
small{display:block;margin-top:18px;color:var(--doux);text-align:center;font-size:.8rem}[hidden]{display:none!important}
</style></head><body><main>
<img src="/assets/fsggb.png" alt="FSGGB"><h1>Intranet de la fédération</h1><p class="s">Connectez-vous pour accéder à vos outils.</p>
<div id="g"></div><div class="ou" id="ou">ou avec un code par e-mail</div>
<form id="f1"><label for="em">Adresse @fsggb.fr</label><input id="em" type="email" autocomplete="email" inputmode="email" required placeholder="prenom.nom@fsggb.fr">
<button class="p" type="submit">Recevoir un code</button></form>
<form id="f2" hidden><label for="cd">Code à 6 chiffres reçu par e-mail</label><input id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required>
<button class="p" type="submit">Se connecter</button></form>
<p id="st" role="status" aria-live="polite"></p>
<small>Un compte Google personnel donne un accès membre, sans les outils réservés à la fédération.</small>
</main>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script>
(()=>{"use strict";
const RETOUR=${JSON.stringify(retour)},CLIENT=${JSON.stringify(clientId)},$=i=>document.getElementById(i),st=$("st");
const dire=(t,c)=>{st.textContent=t;st.className=c||""};
async function appel(chemin,corps){let r;try{r=await fetch("/_connexion/"+chemin,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(corps)})}catch{throw new Error("Serveur injoignable.")}
let o;try{o=await r.json()}catch{throw new Error("Réponse invalide du serveur.")}
if(!o.ok){throw new Error(o.error&&o.error.message||"Erreur.")}return o}
function entrer(o){try{localStorage.setItem("scouthub.token",o.token);localStorage.setItem("scouthub.user",JSON.stringify(o.user))}catch{}
dire("Connecté, ouverture de l'intranet…","o");location.replace(RETOUR)}
if(!CLIENT){$("g").hidden=true;$("ou").hidden=true}
window.addEventListener("load",()=>{const t=setInterval(()=>{if(!window.google||!google.accounts)return;clearInterval(t);
google.accounts.id.initialize({client_id:CLIENT,callback:async r=>{try{dire("Vérification…");entrer(await appel("google",{credential:r.credential}))}catch(e){dire(e.message,"e")}}});
google.accounts.id.renderButton($("g"),{theme:"outline",size:"large",text:"continue_with",locale:"fr",width:320})},150);setTimeout(()=>clearInterval(t),10000)});
$("f1").onsubmit=async e=>{e.preventDefault();const b=e.submitter||e.target.querySelector("button");b.disabled=true;
try{await appel("code/demander",{email:$("em").value.trim()});$("f2").hidden=false;$("cd").focus();dire("Code envoyé : regardez votre boîte de réception.","o")}catch(x){dire(x.message,"e")}b.disabled=false};
$("f2").onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector("button");b.disabled=true;
try{entrer(await appel("code/verifier",{email:$("em").value.trim(),code:$("cd").value.trim()}))}catch(x){dire(x.message,"e");b.disabled=false}};
})();
</script></body></html>`;
