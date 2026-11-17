---
id: topo-gisement
titre: Gisement d'une direction et calcul de coordonnées
theme: Topographie
type: synthese
sources:
  - titre: Topographie-cours1.pdf
    drive: 17OWCob7jbKEbEiifYxsmF2A-1Hnymq1_
    pages: 52-55
mots_cles: gisement, grades, direction, coordonnées, polaire, rectangulaire, G0, orientation du limbe, théodolite, rayonnement, tour d'horizon
liens: topo-lecture-de-carte, topo-nivellement-indirect, src-topographie-cours1, doc-topographie
resume: Le gisement est l'angle d'une direction AB compté de 0 à 400 grades dans le sens des aiguilles d'une montre depuis l'axe des Y (le nord du quadrillage). Il sert à passer des coordonnées polaires (gisement, distance) aux coordonnées rectangulaires et inversement, et à orienter le limbe d'un théodolite (G0).
---

## Définition
Le **gisement** d'une direction orientée AB est l'angle entre cette direction et l'**axe parallèle à l'axe des ordonnées (Y)** de la représentation. Il se compte **positivement de 0 à 400 grades, dans le sens des aiguilles d'une montre**.
(Rappel : 400 grades = un tour complet ; 100 gr = 90°.)

## Conversions
- **Polaire → rectangulaire** : connaissant les coordonnées d'un point A, le gisement G et la distance D de A vers un point M, on calcule les coordonnées de M. Avec la définition ci-dessus (angle depuis l'axe Y, sens horaire) : X(M) = X(A) + D·sin G et Y(M) = Y(A) + D·cos G.
- **Rectangulaire → polaire** : connaissant A et B, on calcule la distance AB = √(ΔX² + ΔY²) et le gisement à partir de ΔX et ΔY ; le cours signale que l'arctangente seule laisse une **ambiguïté de 200 grades**, levée par une formule dédiée (en image dans le document).

## Orientation du limbe (G0) et rayonnement
- Un théodolite lit des angles horizontaux comptés dans le sens horaire depuis une origine « zéro » arbitraire.
- En visant des points connus en coordonnées, on calcule pour chacun un **G0 individuel** (gisement de la direction zéro) ; leur **moyenne** donne l'orientation moyenne du limbe.
- Les écarts entre G0 individuels et moyenne révèlent les erreurs de calcul ou d'observation, ou un point connu déplacé (borne déplacée, mauvaise identification).
- Ensuite, le gisement d'une nouvelle direction = G0 moyen + lecture d'angle horizontal (formule en image), puis on calcule les coordonnées des points nouveaux (exercice du cours : stations sur le point 50, points connus 50 à 54, points nouveaux 80 et 81 ; données en image).

## Questions auxquelles la fiche répond
- Qu'est-ce qu'un gisement ?
- Dans quel sens et dans quelle unité compte-t-on un gisement ?
- Comment calculer les coordonnées d'un point à partir d'un gisement et d'une distance ?
- À quoi sert le G0 d'un théodolite ?
