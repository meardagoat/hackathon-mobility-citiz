# Architecture technique

![Architecture](architecture.jpg)

## 1. Objectif

L'outil aide Citiz (autopartage) et les collectivités à répondre à deux questions :

- **Qui a accès à une option de mobilité à moins de 5 minutes à pied de chez soi ?**
- **Où ajouter de nouvelles stations pour toucher le plus d'habitants avec un budget donné ?**

La chaîne de traitement va des données publiques brutes jusqu'à une liste d'emplacements classés par priorité, affichée dans Power BI.

## 2. Zone d'étude

Le projet est limité à **l'Eurométropole de Strasbourg** :

- Citiz y est historiquement implanté, ce qui donne des stations existantes pour entraîner et valider le modèle ;
- l'offre de transport y est variée (bus, tram, vélos en libre-service, autopartage) ;
- les volumes de données restent raisonnables pour 2,5 jours.

La méthode est générique : il suffit de changer la zone dans les paramètres pour l'appliquer à une autre ville.

## 3. Vue d'ensemble

La solution est organisée en trois blocs :

| Bloc | Rôle | Outils |
|---|---|---|
| Sources | Données publiques ouvertes | transport.data.gouv.fr, INSEE, OpenStreetMap, IGN |
| Traitement | Collecte, nettoyage, calculs, modèle | Microsoft Fabric (notebooks PySpark, Lakehouse) |
| Restitution | Carte, indicateurs, recommandations | Power BI, `app/` |

## 4. Sources de données

| Source | Contenu | Format | Accès |
|---|---|---|---|
| Citiz Grand Est | Stations d'autopartage | GBFS v3 (JSON) | `https://backend.citiz.fr/public/provider/1/gbfs/v3.0/gbfs.json` |
| transport.data.gouv.fr | Vélos et trottinettes en libre-service | GBFS (JSON) | API, flux temps réel |
| transport.data.gouv.fr | Arrêts de bus et tram (CTS) | GTFS (zip de CSV) | Téléchargement |
| INSEE Filosofi | Population et revenus par carreau de 200 m | CSV / GeoPackage | Téléchargement |
| OpenStreetMap (Geofabrik) | Réseau de rues et chemins piétons | PBF | Téléchargement, extrait Alsace |
| IGN Admin Express | Limites des communes et IRIS | GeoPackage | Téléchargement |

Le détail des sources, avec liens et licences, est dans [`DATA_SOURCES.md`](../DATA_SOURCES.md).

## 5. Traitement dans Microsoft Fabric

### 5.1 Espace de travail

Tous les éléments sont dans un même espace de travail Fabric partagé par l'équipe :

- un **Lakehouse** (`LakeHouseMicrosoft`) ;
- les **notebooks** de collecte, de calcul et de modélisation ;
- le **rapport Power BI**.

Chaque notebook est rattaché au Lakehouse comme Lakehouse par défaut.

### 5.2 Lakehouse

```
LakeHouseMicrosoft
├── Files/
│   └── raw/          données brutes, telles que téléchargées
│       ├── gbfs/
│       ├── gtfs/
│       ├── insee/
│       └── osm/
└── Tables/           tables Delta nettoyées, utilisées par les calculs et Power BI
```

- `Files/raw/` garde une copie des fichiers d'origine, pour pouvoir relancer les traitements sans tout retélécharger.
- `Tables/` contient les données propres, au format Delta, lisibles directement par Power BI.

### 5.3 Notebooks

| Notebook | Rôle | Lit | Écrit |
|---|---|---|---|
| `01_collecte_insee` | Télécharge et filtre la population par carreau | INSEE | `Files/raw/insee`, `population_carreaux` |
| `02_collecte_gbfs` | Récupère les stations Citiz, vélos, trottinettes | Flux GBFS | `Files/raw/gbfs`, `stations` |
| `03_...` | Arrêts de bus et tram | GTFS | `stations` |
| `04_...` | Calcul de l'accessibilité | `stations`, `population_carreaux` | `accessibilite` |
| `05_...` | Modèle et optimisation | tables précédentes | `recommandations` |

Les notebooks `03` à `05` sont à compléter avec leurs noms définitifs.

### 5.4 Calcul de l'accessibilité

- Une station est considérée comme accessible si elle est à **moins de 5 minutes à pied**, soit environ **400 m**.
- La distance est calculée à vol d'oiseau dans une première version, puis sur le réseau piéton OpenStreetMap pour une distance de marche réelle.
- Pour chaque carreau de 200 m, on calcule le **nombre d'options de mobilité accessibles par habitant**.
- Pour chaque station, on calcule la **population desservie** dans son rayon de 5 minutes.

### 5.5 Modèle et optimisation

1. **Prédiction** : à partir des stations Citiz existantes, le modèle apprend ce qui caractérise un bon emplacement (densité, revenus, motorisation, offre de transport déjà présente) et attribue un score à chaque emplacement candidat.
2. **Coût** : un coût estimé est associé à chaque type d'équipement (station d'autopartage, station de vélos, arrêt de bus).
3. **Optimisation** : on sélectionne les emplacements qui maximisent la population nouvellement desservie sous contrainte de budget, sans compter deux fois les habitants déjà couverts (problème de couverture maximale).

Le modèle est évalué par validation croisée sur les stations existantes. Les métriques et les limites sont détaillées dans la documentation du modèle.

## 6. Restitution

Le rapport Power BI se connecte directement aux tables du Lakehouse et contient trois pages :

1. **Carte de chaleur** : accès à la mobilité par carreau, du moins au mieux desservi.
2. **Stations** : stations existantes par type, avec la population desservie par chacune.
3. **Recommandations** : emplacements proposés, coût, habitants nouvellement desservis, total selon le budget choisi.

Le dossier `app/` contient l'interface de démonstration.

## 7. Tables échangées

| Table | Créée par | Utilisée par | Colonnes |
|---|---|---|---|
| `stations` | collecte GBFS / GTFS | calcul, Power BI | id, type, nom, lat, lon |
| `population_carreaux` | collecte INSEE | calcul, modèle | id_carreau, lat, lon, population |
| `accessibilite` | calcul | modèle, Power BI | id_carreau, nb_options, options_par_habitant |
| `recommandations` | modèle | Power BI, app | lat, lon, type, cout, personnes_gagnees, rang |

Noms provisoires, à confirmer avec l'équipe. Toute modification d'un nom de table ou de colonne doit être signalée, car elle impacte les étapes suivantes.

## 8. Organisation du dépôt

```
.
├── DATA_SOURCES.md     liste des sources de données
├── README.md           présentation et lancement du projet
├── requirements.txt    dépendances Python
├── src/                code source (collecte, calculs, modèle)
├── notebooks/          notebooks générés depuis src/, importés dans Fabric
├── app/                interface de démonstration
├── data/               petits fichiers d'exemple (pas de données volumineuses)
├── docs/               documentation technique
├── fabric/             éléments synchronisés depuis Fabric
└── slides/             présentation
```

## 9. Workflow de développement

- Le code est écrit dans `src/`. Les notebooks sont générés à partir de ce code, puis importés dans Fabric.
- Les notebooks ne sont **pas modifiés directement dans Fabric** : on les y exécute seulement.
- Chaque membre travaille sur une branche `feature/...`, puis ouvre une Pull Request vers `dev`.
- Les Pull Requests sont relues avant fusion.
- `dev` est fusionnée dans `main` pour la version finale de la démo.

```
feature/...  →  dev  →  main
```

## 10. Reproduire le projet

1. Créer un espace de travail Fabric avec une capacité active.
2. Créer un Lakehouse.
3. Importer les notebooks du dossier `notebooks/` (Importer → Notebook → À partir de cet ordinateur).
4. Rattacher chaque notebook au Lakehouse (Explorateur → Ajouter des éléments de données → Catalogue OneLake).
5. Exécuter les notebooks dans l'ordre : `01`, `02`, puis les suivants.
6. Ouvrir le rapport Power BI connecté au Lakehouse.

## 11. Choix techniques

| Choix | Raison |
|---|---|
| Microsoft Fabric | Calcul dans le cloud (pas de limite liée aux machines de l'équipe), stockage partagé, Power BI intégré |
| Lakehouse + Delta | Un seul point de stockage pour tous les notebooks et pour Power BI |
| Code dans `src/`, notebooks générés | Code versionné proprement dans Git, notebooks toujours à jour |
| Carreaux INSEE 200 m | Maille fine, adaptée à une distance de 5 min à pied |
| Restriction à une métropole | Volumes maîtrisés, résultats vérifiables, méthode réutilisable ailleurs |

## 12. Limites et points d'attention

- **Distances** : le calcul à vol d'oiseau surestime l'accessibilité ; le réseau piéton OSM est plus réaliste mais plus coûteux à calculer.
- **Données temps réel** : les flux GBFS donnent l'état à un instant donné ; l'usage réel des stations n'est pas publié.
- **Coûts** : les coûts par équipement sont des estimations.
- **Vie privée** : les carreaux INSEE peu peuplés sont regroupés ou masqués pour ne pas exposer de petits groupes d'habitants.
- **Équité** : le classement tient compte des zones peu desservies pour ne pas favoriser uniquement les quartiers déjà bien équipés.