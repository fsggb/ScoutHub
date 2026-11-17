---
id: topo-nivellement-direct
titre: Nivellement direct (géométrique) au niveau et à la mire
theme: Topographie
type: synthese
sources:
  - titre: Topographie-cours1.pdf
    drive: 17OWCob7jbKEbEiifYxsmF2A-1Hnymq1_
    pages: 34-48
mots_cles: nivellement, niveau, mire, dénivelée, altitude, portée, nivelle sphérique, vis calantes, niveau automatique, compensateur, réticule, fils stadimétriques, cheminement, lecture arrière, lecture avant, fermeture, tolérance
liens: topo-nivellement-indirect, topo-fautes-et-erreurs, topo-generalites-definitions, src-topographie-cours1, doc-topographie
resume: Mesurer des différences d'altitude avec un niveau et une mire - dénivelée = lecture en A moins lecture en B, portées égales et maximum 60 m (35 m en précision), mise en station par les vis calantes, lecture des 4 fils du réticule, cheminements encadrés, fermés et mixtes, contrôle de fermeture.
---

## Principe
- Le **niveau** (lunette tournant autour d'un axe vertical) définit un **plan de visée horizontal** ; la **mire** est une règle graduée tenue verticalement sur chaque point.
- On lit **ma** sur la mire en A et **mb** en B :
  - **ΔH(A→B) = ma − mb** ; ΔH(B→A) = mb − ma.
  - Si ΔH(A→B) est négative, B est plus bas que A.
  - **HB = HA + ΔH(A→B).**
- L'altitude H d'un point est sa distance verticale au géoïde (niveau 0).
- **Portée** (distance niveau-mire) : **au maximum 60 m en nivellement ordinaire, 35 m en précision** (le cours cite aussi 30 m en précision). Placer le niveau **à égale distance de A et B** (sur la médiatrice) pour égaliser les portées.

## Le niveau
- Éléments : embase, 3 vis calantes, rotation lente, mise au point, objectif, viseur, oculaire, compensateur à pendule, nivelle sphérique, parfois cercle horizontal (précision médiocre ±0,25 gon).
- **Mise en station** : poser le trépied n'importe où, reculer pour vérifier que le plateau est à peu près horizontal, fixer le niveau.
- **Calage de la nivelle sphérique** : tourner les vis V1 et V2 **en sens inverse l'une de l'autre** pour amener la bulle sur une droite, puis la vis V3 pour la centrer.
- Ce calage est peu précis (exemple NA20 : 0,2 mm d'erreur de bulle → 8 mm d'écart sur une mire à 35 m). Sur un **niveau « automatique »**, il ne sert qu'à approcher la verticale ; un **compensateur** (prisme suspendu soumis à la pesanteur) rend ensuite la visée horizontale.

## Lire la mire
- Mire graduée en centimètres, chiffrée en décimètres, tenue verticale (elle a une nivelle sphérique).
- Le réticule a 4 fils : **stadimétrique supérieur (m1)**, **stadimétrique inférieur (m2)**, **niveleur (m)**, **vertical** (pointé).
- Chaque lecture s'estime **au millimètre**. Lire les trois fils et vérifier sur place que **m = (m1 + m2) / 2** pour éviter les fautes.
- Conseil : noter les lectures **en millimètres sans virgule** (1 264 mm plutôt que 12,64 dm ; 0 132), les altitudes aussi (125 703), pour éviter les erreurs d'unités.

## Cheminements
Quand une seule station ne suffit pas (distance, obstacle, forte dénivelée), on passe par des points intermédiaires :
- **Encadré** : d'un point connu à un autre point connu.
- **Aller-retour** : de A à B puis retour à A, pour contrôler.
- **Fermé** : boucle revenant au départ ; la dénivelée totale doit être **nulle** ; fonctionne même avec un seul repère ou une altitude arbitraire.

**Pratique**
1. Mire sur A ; stationner le niveau en S1 en **comptant ses pas** (portée ≤ 60 m) ; **lecture arrière** sur A.
2. Le porte-mire va sur un point intermédiaire I1 stable (pierre, « crapaud » métallique, piquet) en refaisant le même nombre de pas.
3. **Lecture avant** sur I1 : ΔH1 = lecture arrière A − lecture avant I1. Vérifier m = (m1 + m2)/2.
4. Déplacer le niveau en S2, etc.
- **ΔH totale = somme des lectures arrière − somme des lectures avant.**
- Exemple du cours : départ 124,968 m, arrivée 128,924 m, **fermeture 16 mm pour une tolérance de 18 mm** : acceptée.

**Cheminement mixte** : depuis une station, on vise aussi des points de détail (lecture unique, dite **rayonnement**) entre la lecture arrière et la lecture avant. Exemple du cours : fermeture 14 mm, tolérance 15 mm.

(Les formules de fermeture et de compensation p. 42-43 sont des images.)

## Questions auxquelles la fiche répond
- Comment mesurer une différence d'altitude avec un niveau et une mire ?
- Pourquoi placer le niveau à mi-distance des deux points ?
- Quelle portée maximale entre niveau et mire ?
- Comment caler la bulle avec les vis calantes ?
- Qu'est-ce qu'un cheminement fermé et comment le contrôler ?
