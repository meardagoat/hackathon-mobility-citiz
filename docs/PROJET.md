# Le projet, les attendus et qui fait quoi

## 1. Le problème

Bus, tram, vélos et trottinettes en libre-service, autopartage : l'offre de mobilité augmente, mais elle est très inégalement répartie sur le territoire. Depuis la loi LOM, la plupart de ces services publient leurs données en open data :
- **GTFS** pour les transports en commun (arrêts, lignes, horaires) ;
- **GBFS** pour les services partagés (stations vélo, trottinettes, autopartage).

La population est elle aussi publique (INSEE, carreaux de 200 m).

**Citiz**, partenaire du hackathon, est le premier réseau coopératif d'autopartage en France : ~2 800 voitures, ~280 villes, ~130 000 conducteurs. Comme tout opérateur, Citiz doit choisir où ouvrir ses prochaines stations. Il faut qu'elles touchent le plus d'habitants, qu'elles complètent l'offre existante et qu'elles trouvent leurs utilisateurs.

**Notre mission** : transformer ces données ouvertes en **outil d'aide à la décision d'implantation**.

## 2. Ce qu'on doit produire (3 objectifs)

| # | Objectif | Concrètement |
|---|---|---|
| 1 | **Cartographier l'accès à la mobilité** | Une carte où chaque zone est colorée du froid au chaud selon le **nombre d'options de transport accessibles par habitant à 5 min à pied**. |
| 2 | **Montrer qui est concerné** | Afficher sur la carte les arrêts et stations par type (bus, tram, vélo, trottinette, Citiz…) avec la **population desservie par chacun**. |
| 3 | **Proposer où implanter et investir** ⭐ | Recommander où Citiz doit ouvrir de nouvelles stations, et plus largement où ajouter un arrêt de bus ou une station vélo, pour **toucher le plus de monde au moindre coût**. |

**L'objectif 3 est le cœur du projet.** Les objectifs 1 et 2 posent le diagnostic, le 3 le transforme en décision.

L'outil de l'objectif 3 doit obligatoirement :
- **estimer la valeur d'un emplacement candidat** (population nouvellement desservie, usage potentiel) avec un **modèle prédictif** ;
- **intégrer une estimation de coût** pour chaque type d'équipement (station Citiz, arrêt de bus, station vélo) ;
- **produire une liste priorisée d'emplacements sous contrainte de budget**, en tenant compte de l'offre déjà existante.

**Périmètre** : la France entière, DROM compris, ou une métropole / région **si on justifie le choix**. Si Citiz n'est pas présent dans la zone choisie, l'objectif 3 devient : montrer où et comment Citiz pourrait s'y implanter.

**Outils** : Microsoft Fabric est conseillé (traitement de données, ML, visualisation), les accès seront donnés au début. On peut utiliser autre chose, mais il faudra le justifier à la soutenance.

## 3. Livrables (sur le repo Git)

- [ ] Le **code** du projet
- [ ] Les **slides** de la présentation (`slides/`)
- [ ] La **liste des sources de données** (`DATA_SOURCES.md`)
- Si on est sélectionnés pour la finale nationale : un prototype fonctionnel et une documentation technique pour que le travail puisse être repris.

## 4. Comment on sera évalués

On a **2,5 jours**, et l'essentiel est de **convaincre**. La soutenance comprend :

1. **Une démo live sur des données réelles.** Elle doit marcher du premier coup.
2. **Un argumentaire pour un non-technicien** : un problème concret, une recommandation claire, un **impact chiffré** (par exemple « +12 000 habitants desservis pour 300 k€ »), et ce que ça apporte à Citiz.
3. **Un argumentaire pour un data scientist** : choix méthodologiques justifiés, **modèle évalué rigoureusement**, limites assumées.
4. **L'éthique et l'impact sociétal**, qui comptent dans la note :
   - impact carbone estimé (report de la voiture individuelle vers la mobilité partagée) ;
   - équité entre zones denses et peu denses (ne pas servir uniquement les zones déjà bien desservies) ;
   - risque de stigmatiser un territoire étiqueté « mal desservi » ;
   - protection de la vie privée dans les zones très peu peuplées.

⚠️ **Chaque membre doit pouvoir expliquer l'ensemble du projet** et répondre en détail sur sa propre partie.

## 5. Approche technique proposée

**Zone d'étude** : une métropole où Citiz est déjà présent, pour pouvoir apprendre sur ses stations existantes. Proposition : **Strasbourg (Eurométropole)**. C'est le berceau de Citiz, avec un GTFS (CTS) et un GBFS vélo (Vélhop) disponibles. On valide ce choix ensemble au lancement. Si le temps le permet, on montre ensuite que la méthode se généralise à une deuxième ville.

**Unité d'analyse** : le **carreau INSEE de 200 m** (population, revenus, ménages).

**Chaîne de traitement :**

```
GTFS + GBFS + Citiz ─┐
INSEE carreaux ──────┼─> [Données] ─> [Accessibilité 5 min] ─> [Modèle de valeur] ─> [Optimisation budget] ─> [Carte / démo]
OSM réseau piéton ───┘                    obj. 1 & 2                         obj. 3
```

1. **Accessibilité (objectifs 1 et 2)** : « 5 min à pied » ≈ **400 m sur le réseau piéton OSM**. On calcule les isochrones par arrêt ou station, avec un simple rayon de 400 m comme solution de secours. Pour chaque carreau, on compte les options accessibles par type et on calcule le score par habitant. Pour chaque arrêt, la population desservie est la somme des carreaux couverts.
2. **Modèle prédictif (objectif 3)** : apprendre ce qui caractérise un bon emplacement à partir des stations Citiz et vélo existantes. Les variables explicatives sont la densité, le revenu, la motorisation des ménages, l'offre de transport proche, les équipements, les emplois et les projections démographiques. On évalue par **validation croisée spatiale** (pas de fuite entre zones voisines) et on compare à une baseline simple.
3. **Coûts** : des ordres de grandeur **sourcés** par type d'équipement (installation + fonctionnement annuel).
4. **Optimisation** : choisir les emplacements qui **maximisent la population nouvellement couverte pondérée par l'usage prédit, sous un budget donné**, sans double-compter les habitants déjà desservis. Problème de couverture maximale, résolu par algorithme glouton ou programmation linéaire (PuLP).
5. **Démo** : carte interactive avec les couches d'accessibilité, d'arrêts et de recommandations, plus un **curseur de budget** qui met à jour la liste priorisée en direct.

## 6. Répartition du travail (équipe de 4)

| Rôle | Responsable | Missions | Livre à l'équipe |
|---|---|---|---|
| **A. Données & pipeline** | _à attribuer_ | Télécharger et nettoyer GTFS, GBFS (dont Citiz), carreaux INSEE, IRIS IGN, réseau OSM pour la zone choisie. Unifier tous les arrêts et stations dans un même format. Tenir `DATA_SOURCES.md`. Mettre en place Microsoft Fabric (lakehouse) dès que les accès arrivent. | `data/processed/stops.parquet` (id, type, opérateur, géométrie) et `data/processed/carreaux.parquet` (population, revenus, ménages, géométrie) **avant la fin de la matinée du jour 1** |
| **B. Accessibilité & cartographie (obj. 1-2)** | _à attribuer_ | Calculer les isochrones 5 min à pied, le score d'accessibilité par carreau et la population desservie par arrêt. Produire les cartes des objectifs 1 et 2. Repérer les zones blanches. | `accessibility.parquet` (score par carreau) et `stops_served.parquet` (population par arrêt), plus la carte |
| **C. Modèle prédictif & optimisation (obj. 3)** | _à attribuer_ | Construire les variables, entraîner et **évaluer** le modèle (validation spatiale, métriques, baseline). Écrire la table de coûts et l'algorithme de sélection sous budget. | Une fonction `recommander(budget, types)` qui renvoie la liste priorisée avec la valeur estimée, le coût et la population gagnée |
| **D. Produit, démo & soutenance** | _à attribuer_ | Construire l'app de démo (carte et curseur budget). Chiffrer l'impact (habitants gagnés, CO₂ évité). Rédiger la partie éthique. Préparer les slides et le storytelling, coordonner les répétitions. | L'app démo, les slides dans `slides/` et le script de soutenance |

**Points de contact entre rôles :**
- A → B et C : les formats de `stops` et `carreaux` sont figés dès la première heure. B et C commencent avec un **petit échantillon** sans attendre les données complètes.
- B → C : la couverture actuelle (qui est déjà desservi) sert à ne pas recompter les habitants dans l'optimisation.
- C → D : D branche l'app sur des **résultats factices** dès le jour 1, puis les remplace par les vrais.

**Si on est 3** : D est réparti entre B (app et carte) et C (slides et impact), et tout le monde prépare la soutenance le dernier jour.
**Si on est 5** : on ajoute un rôle **E « Usage & impact »** qui collecte les données de contexte (motorisation, emplois, équipements, projections Omphale) pour le modèle et s'occupe du calcul CO₂ et de l'éthique.

## 7. Planning (2,5 jours)

| Moment | Objectif | Jalon |
|---|---|---|
| **J1 matin** | Lancement : on valide la zone et les formats, on configure le repo et Fabric | Données de base chargées pour la zone (A), squelette de l'app (D) |
| **J1 après-midi** | Premières versions de bout en bout | Carte d'accessibilité v1 (B), modèle baseline + glouton (C) |
| **J2 matin** | Montée en qualité | Isochrones sur le réseau réel (B), modèle évalué + coûts sourcés (C) |
| **J2 après-midi** | Intégration | **Démo complète de bout en bout** branchée sur les vraies données |
| **J2 soir** | Gel des fonctionnalités | Plus de nouvelle fonctionnalité, uniquement des corrections |
| **J3 matin** | Soutenance | Slides finales, 2 répétitions chronométrées, plan B si la démo plante (captures et vidéo) |

**Règle d'or** : une version simple qui marche de bout en bout dès le J1 soir vaut mieux qu'une version parfaite qui n'est pas intégrée le J3.

## 8. Fonctionnement de l'équipe

- Point de synchro de 10 min **matin, midi et soir** sur Teams.
- Une branche par tâche et des pull requests vers `main`. On ne commit jamais de données, seulement les scripts qui les téléchargent.
- Toute nouvelle source va **immédiatement** dans `DATA_SOURCES.md`.
- Chaque responsable écrit 3-4 lignes dans ce document pour expliquer ses choix : ça servira pour les questions du jury.
