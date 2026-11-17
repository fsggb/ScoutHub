# Format des fiches de connaissances de ChatGDB

Une fiche = un fichier Markdown dans `connaissances/src/<theme>/<id>.md`, en français.
`node scripts/connaissances.mjs` en fait `connaissances/index.json` (la carte : nœuds + liens) et
`connaissances/fiches/<id>.json` (la fiche complète), que ChatGDB lit depuis GitHub Pages.

```
---
id: froissartage-tenon-mortaise          # minuscules, chiffres, tirets ; unique
titre: Tenon et mortaise en froissartage
theme: Froissartage                       # Froissartage, Matelotage, Cuisine, Feu, Outils, Pyrotechnie,
                                          # Topographie, Cryptographie, Religion, Chants, Applications
type: synthese                            # document (un document source résumé) | synthese | application
sources:                                  # documents Drive d'où vient l'information
  - titre: Froissartage - fiches techniques.pdf
    drive: 19lE55xYj5v-5Qr2pcPtni6SUvdQukV32
    pages: 4-7
mots_cles: tenon, mortaise, assemblage, perche, tarière
liens: froissartage-outils, froissartage-mi-bois   # id d'autres fiches liées
resume: Deux ou trois phrases qui disent ce que la fiche apprend et à quelles questions elle répond.
---

## Sections détaillées
Texte complet et autonome : chiffres, dimensions, étapes numérotées, erreurs fréquentes,
sécurité, variantes, vocabulaire. Une personne qui n'a pas le document doit pouvoir faire.
Les paroles de chants : titre, auteur, premier vers et thème seulement (droits d'auteur), sauf
domaine public.

## Questions auxquelles la fiche répond
- …
```
