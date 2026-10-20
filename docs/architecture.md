# Architecture technique

![Architecture](architecture.jpg)

## 1. Objectif

L'outil aide Citiz (autopartage) et les collectivités à répondre à deux questions :

- **Qui a accès à une option de mobilité à moins de 5 minutes à pied de chez soi ?**
- **Où ajouter de nouvelles stations pour toucher le plus d'habitants avec un budget donné ?**

La chaîne de traitement va des données publiques brutes jusqu'à une liste d'emplacements classés par priorité, affichée dans Power BI.

## 2. Zone d'étude

Le projet est limité à **Bordeaux Métropole**. La méthode est générique : il suffit de changer la zone dans les paramètres pour l'appliquer à une autre ville.

## 3. Vue d'ensemble

| Bloc | Rôle | Outils |
|---|---|---|
| Sources | Données publiques ouvertes | transport.data.gouv.fr, INSEE, OpenStreetMap, IGN |
| Traitement | Collecte, nettoyage, calculs, modèle | Microsoft Fabric (notebooks, Lakehouse) |
| Restitution | Carte, indicateurs, recommandations | Power BI, `app/` |

Dans Fabric, le pipeline est organisé dans le flux de tâches **« Mobilite Citiz Bordeaux »** de l'espace de travail **HackathonZ** :

```
Get data → Store data → Exploratory data analysis → Develop and train models
→ Evaluate and score models → Apply the best model → Expose insight
```

## 4. Sources de données

| Source | Contenu | Format |
|---|---|---|
| transport.data.gouv.fr | Stations Citiz, vélos et trottinettes en libre-service | GBFS (JSON, temps réel) |
| transport.data.gouv.fr | Arrêts de bus et tram (TBM) | GTFS (zip de CSV) |
| INSEE Filosofi | Population et revenus par carreau de 200 m | CSV / GeoPackage |
| OpenStreetMap (Geofabrik) | Réseau de rues et chemins piétons | PBF |
| IGN Admin Express | Limites des communes et IRIS | GeoPackage |

Le détail des sources, avec liens et licences, est dans [`DATA_SOURCES.md`](../DATA_SOURCES.md).

## 5. Traitement dans Microsoft Fabric

### 5.1 Lakehouse

Tous les notebooks utilisent **LakeHouseZ** comme Lakehouse par défaut.

```
LakeHouseZ
├── Files/
│   └── raw/          données brutes, telles que téléchargées
└── Tables/           tables Delta nettoyées, utilisées par les calculs et Power BI
```

- `Files/raw/` garde une copie des fichiers d'origine, pour relancer les traitements sans tout retélécharger.
- `Tables/` contient les données propres, au format Delta, lisibles directement par Power BI.

### 5.2 Notebooks

| Notebook | Étape du flux | Rôle |
|---|---|---|
| `00_synchro_github` | Get data | Récupère la dernière version du code depuis le dépôt GitHub |
| `01_collecte_insee` | Get data | Population par carreau de 200 m |
| `02_collecte_gbfs` | Get data | Stations Citiz, vélos, trottinettes |
| `03_collecte_gtfs` | Get data | Arrêts de bus et tram |
| `04_accessibilite` | Exploratory data analysis | Options de mobilité à 5 min à pied, population desservie |
| `scoring` | Evaluate and score models | Score des emplacements candidats |

### 5.3 Calcul de l'accessibilité

- Une station est considérée comme accessible si elle est à **moins de 5 minutes à pied**, soit environ **400 m**.
- Pour chaque carreau de 200 m, on calcule le **nombre d'options de mobilité accessibles par habitant**.
- Pour chaque station, on calcule la **population desservie** dans son rayon de 5 minutes.

### 5.4 Modèle et recommandations

1. **Prédiction** : le modèle attribue un score à chaque emplacement candidat à partir des caractéristiques du quartier (population, revenus, offre de transport existante).
2. **Coût** : un coût estimé est associé à chaque type d'équipement.
3. **Optimisation** : on sélectionne les emplacements qui maximisent la population nouvellement desservie sous contrainte de budget, sans compter deux fois les habitants déjà couverts.

Méthode d'évaluation et métriques : à compléter.

## 6. Restitution

Le rapport Power BI (étape **Expose insight**) se connecte directement aux tables de LakeHouseZ :

1. **Carte de chaleur** : accès à la mobilité par carreau.
2. **Stations** : stations existantes par type, avec la population desservie.
3. **Recommandations** : emplacements proposés, coût, habitants nouvellement desservis.

## 7. Tables échangées

| Table | Créée par | Colonnes |
|---|---|---|
| à compléter | `01_collecte_insee` | |
| à compléter | `02_collecte_gbfs` | |
| à compléter | `03_collecte_gtfs` | |
| à compléter | `04_accessibilite` | |
| à compléter | `scoring` | |

## 8. Organisation du dépôt

```
.
├── DATA_SOURCES.md     liste des sources de données
├── README.md           présentation et lancement du projet
├── requirements.txt    dépendances Python
├── src/                code source (collecte, calculs, modèle)
├── notebooks/          notebooks générés depuis src/
├── app/                interface de démonstration
├── data/               petits fichiers d'exemple
├── docs/               documentation technique
├── fabric/             éléments synchronisés depuis Fabric
└── slides/             présentation
```

## 9. Workflow de développement

- Le code est écrit dans `src/`, puis les notebooks sont générés et synchronisés dans Fabric avec `00_synchro_github`.
- Les notebooks ne sont **pas modifiés directement dans Fabric** : on les y exécute seulement.
- Chaque membre travaille sur une branche `feature/...`, puis ouvre une Pull Request vers `dev`.
- `dev` est fusionnée dans `main` pour la version finale.

```
feature/...  →  dev  →  main
```

## 10. Reproduire le projet

1. Créer un espace de travail Fabric avec une capacité active.
2. Créer un Lakehouse.
3. Importer les notebooks et les rattacher au Lakehouse (Explorateur → Ajouter des éléments de données → Catalogue OneLake).
4. Exécuter dans l'ordre : `00_synchro_github`, `01_collecte_insee`, `02_collecte_gbfs`, `03_collecte_gtfs`, `04_accessibilite`, `scoring`.
5. Ouvrir le rapport Power BI connecté au Lakehouse.

## 11. Choix techniques

| Choix | Raison |
|---|---|
| Microsoft Fabric | Calcul dans le cloud, stockage partagé, Power BI intégré |
| Lakehouse + Delta | Un seul point de stockage pour tous les notebooks et pour Power BI |
| Flux de tâches Fabric | Pipeline lisible, chaque notebook rattaché à son étape |
| Code dans `src/`, synchronisé depuis GitHub | Code versionné proprement, notebooks toujours à jour |
| Carreaux INSEE 200 m | Maille fine, adaptée à une distance de 5 min à pied |
| Restriction à Bordeaux Métropole | Volumes maîtrisés, résultats vérifiables, méthode réutilisable |

## 12. Limites et points d'attention

- **Distances** : le calcul à vol d'oiseau surestime l'accessibilité ; le réseau piéton est plus réaliste mais plus coûteux à calculer.
- **Données temps réel** : les flux GBFS donnent l'état à un instant donné ; l'usage réel des stations n'est pas publié.
- **Coûts** : les coûts par équipement sont des estimations.
- **Vie privée** : les carreaux INSEE peu peuplés ne doivent pas permettre d'identifier de petits groupes d'habitants.
- **Équité** : le classement doit tenir compte des zones peu desservies, et pas seulement des quartiers déjà bien équipés.![alt text](architecture.jpg)