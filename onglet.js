// Pages statiques à un seul onglet (Documentation, Inscriptions) : barre du haut + barre du bas, rien d'autre.
// L'onglet actif vient de data-onglet sur <body>.
(() => {
  "use strict";
  Hub.renderBar(Hub.cachedUser());
  Hub.renderTabs(document.body.dataset.onglet || "");
  if (Hub.store.get() && window.SCOUTHUB_API) Hub.call("me").then(o => { Hub.user = o.user; Hub.cacheUser(o.user); Hub.renderBar(o.user); }).catch(() => {});
})();
