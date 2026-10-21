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
| Sources | Données publiques ouvertes | transport.data.gouv.fr (Point d'Accès National), data.gouv.fr, INSEE |
| Traitement | Collecte, nettoyage, calculs, modèle | Microsoft Fabric (notebooks, Lakehouse) |
| Restitution | Carte, indicateurs, recommandations | Power BI, `app/` |

Dans Fabric, le pipeline est organisé dans le flux de tâches **« Mobilite Citiz Bordeaux »** de l'espace de travail **HackathonZ** :

```
Get data → Store data → Exploratory data analysis → Develop and train models
→ Evaluate and score models → Apply the best model → Expose insight
```

## 4. Sources de données

| Source | Contenu | Format | Notebook |
|---|---|---|---|
| INSEE Filosofi 2021 | Population et revenus par carreau de 200 m | CSV / GeoPackage | `01_collecte_insee` |
| Point d'Accès National (transport.data.gouv.fr) | Stations Citiz, vélos et trottinettes en libre-service | GBFS (JSON) | `02_collecte_gbfs` |
| Point d'Accès National (transport.data.gouv.fr) | Réseaux de bus et tram de Bordeaux / Gironde (TBM) | GTFS (zip de CSV) | `03_collecte_gtfs` |
| data.gouv.fr | Agrégat national des arrêts de transport | CSV | `03_collecte_gtfs` |

OpenStreetMap et l'IGN, cités dans le sujet, ne sont pas collectés : le rayon de 5 minutes est calculé à vol d'oiseau, et la commune de chaque carreau vient du code INSEE (`lcog_geo`).

Le détail des sources, avec liens et licences, est dans [`DATA_SOURCES.md`](../DATA_SOURCES.md). Le détail complet des colonnes est dans [`DONNEES.md`](DONNEES.md).

## 5. Traitement dans Microsoft Fabric

### 5.1 Lakehouse

Tous les notebooks utilisent **LakeHouseZ** comme Lakehouse par défaut.

```
LakeHouseZ
├── Files/
│   ├── raw/          données brutes + copie Parquet de chaque table (raw/tables/)
│   └── gold/         sorties des notebooks 04 et 05 en Parquet, et en JSON dans gold/export/
└── Tables/           tables Delta nettoyées, utilisées par les calculs et Power BI
```

- `Files/raw/` garde les fichiers d'origine et une copie Parquet de chaque table, pour relancer les traitements sans tout retélécharger.
- `Files/gold/` contient les sorties des notebooks 04 et 05, lues par le backend.
- `Tables/` contient les données propres, au format Delta, lisibles directement par Power BI.

### 5.2 Notebooks

Les notebooks sont dans [`fabric/notebooks/`](../fabric/notebooks/). `00_synchro_github` les crée ou les met à jour dans Fabric depuis GitHub, à partir de la liste de `fabric/notebooks/manifest.json`.

| Notebook | Étape du flux | Rôle |
|---|---|---|
| `00_synchro_github` | Get data | Récupère la dernière version du code depuis le dépôt GitHub |
| `01_collecte_insee` | Get data | Population par carreau de 200 m |
| `02_collecte_gbfs` | Get data | Stations Citiz, vélos, trottinettes |
| `03_collecte_gtfs` | Get data | Arrêts de bus et tram |
| `04_accessibilite` | Exploratory data analysis | Options de mobilité à 5 min à pied, population desservie |
| `05_score_classement` | Evaluate and score models | Modèle d'adéquation, coûts, classement des emplacements sous budget |

### 5.3 Calcul de l'accessibilité

- Une station est considérée comme accessible si elle est à **moins de 5 minutes à pied**, soit un **rayon de 400 m à vol d'oiseau** autour du centre du carreau.
- Pour chaque carreau de 200 m, on calcule le **nombre d'options de mobilité accessibles par habitant**.
- Pour chaque station, on calcule la **population desservie** dans son rayon de 5 minutes.
- `niveau_acces` (1 à 5) est calculé sur `nb_options` : 1 = aucune option à 400 m ; 2 à 5 = quartiles de `nb_options` parmi les carreaux desservis. Il ne dépend pas de la population, donc il ne révèle rien sur les carreaux masqués.
- Offre prise en compte : réseau TBM uniquement (lignes scolaires exclues) et stations fixes Le Vélo TBM et Citiz. Les engins en libre-service sans station (Dott, Pony) sont exclus.

### 5.4 Modèle et recommandations

1. **Prédiction** : le modèle attribue un score à chaque emplacement candidat à partir des caractéristiques du quartier (population, revenus, offre de transport existante).
2. **Coût** : un coût estimé est associé à chaque type d'équipement.
3. **Optimisation** : on sélectionne les emplacements qui maximisent la population nouvellement desservie sous contrainte de budget, sans compter deux fois les habitants déjà couverts.

- **Évaluation** : AUC en validation croisée spatiale (les carreaux sont groupés par blocs de 2 km, pour ne pas évaluer le modèle sur des voisins de ses données d'entraînement). Résultats : Citiz 0,94, vélo 0,92, bus 0,66.
- **Coût** : investissement + 3 ans de fonctionnement (table `couts`, sources dans `hypotheses`).
- **Classement** : les candidats sont triés par **valeur par euro**, sous 4 budgets (100 k€, 250 k€, 500 k€, 1 M€) × 2 périmètres (`citiz` seul, ou `tous` : citiz + vélo + bus).
- **Équité** : les habitants sans aucune option à 400 m comptent 50 % de plus dans la valeur d'un emplacement.
- **Impact** : `voitures_evitees` = 8 par station Citiz (Livre blanc de l'autopartage Citiz 2025).

## 6. Restitution

Le rapport Power BI (étape **Expose insight**) s'appuie sur le modèle sémantique **modele_mobilite_bordeaux-citiz** (Direct Lake sur SQL). Il utilise les tables `carreaux`, `offre_existante`, `recommandations`, `impacts` et la vue `v_carreaux_acces`.

| Page | Contenu |
|---|---|
| Diagnostic | Niveau d'accès (`classe_acces`, de 1 à 5) par carreau de 200 m. Les carreaux masqués sont exclus (secret statistique INSEE : moins de 11 ménages). |
| Offre existante | Arrêts et stations par type (bus, tram, vélo, Citiz, bateau…) avec les habitants desservis. Segment par type. |
| Recommandations | Segments budget (100 k€, 250 k€, 500 k€, 1 M€) et périmètre (`citiz` ou `tous`). Carte des emplacements et tableau classé par rang. |

Le backend (`backend/`) lit les fichiers Parquet de `Files/gold/` (voir [`backend/README.md`](../backend/README.md)).

## 7. Tables du Lakehouse

Toutes les tables sont dans `LakeHouseZ / Tables / dbo`. Elles ont toutes une colonne `date_collecte` (UTC), et les coordonnées sont en WGS84.

### `01_collecte_insee`

| Table | Contenu | Colonnes principales |
|---|---|---|
| `insee_carreaux_200m` | Population et revenus par carreau | `idcar_200m`, `lcog_geo` (code commune), `ind` (habitants), `men`, `men_pauv`, `men_prop`, `men_coll`, `ind_*` (tranches d'âge), `i_est_200` (carreau imputé, masqué), `lon` / `lat` (centre) |

### `02_collecte_gbfs`

| Table | Contenu | Colonnes principales |
|---|---|---|
| `gbfs_flux` | Catalogue des flux et statut de collecte | `jeu_titre`, `producteur`, `est_citiz`, `licence`, `statut`, `nb_stations` |
| `gbfs_stations` | Stations fixes | `station_id`, `nom`, `systeme_nom`, `operateur`, `est_citiz`, `types_vehicules`, `lat` / `lon`, `capacite` |
| `gbfs_types_vehicules` | Types de véhicules par système | `vehicle_type_id`, `form_factor`, `propulsion_type` |
| `gbfs_etat_stations` | Historique de disponibilité (une photo par exécution) | `station_id`, `vehicules_disponibles`, `places_disponibles`, `date_collecte` |
| `gbfs_vehicules` | Historique des véhicules | `vehicule_id`, `station_id` ou `lat` / `lon`, `est_reserve`, `date_collecte` |

### `03_collecte_gtfs`

| Table | Contenu | Colonnes principales |
|---|---|---|
| `gtfs_catalogue` | GTFS publiés en France | `jeu_titre`, `producteur`, `licence`, `modes`, `url` |
| `gtfs_arrets_france` | Tous les arrêts de France | `stop_id`, `stop_name`, `stop_lat` / `stop_lon`, `dataset_organisation`, `licence_reseau` |
| `gtfs_ressources` | Statut de lecture de chaque réseau de la zone | `statut`, `fichiers`, `nb_arrets` |
| `gtfs_agency`, `gtfs_routes`, `gtfs_stops`, `gtfs_trips`, `gtfs_calendar`, `gtfs_calendar_dates`, `gtfs_stop_times` | GTFS complets de Bordeaux / Gironde | Colonnes standard GTFS (`route_type` : tram, bus…), plus `ressource_id` et `jeu_titre` |

### `04_accessibilite` et `05_score_classement`

Ces tables sont écrites en Delta (`Tables/dbo`), en Parquet (`Files/gold/<table>.parquet`) et, pour la plupart, en JSON (`Files/gold/export/<table>.json`). Le détail des colonnes est dans [`DATA_CONTRACT.md`](DATA_CONTRACT.md).

| Table | Notebook | Contenu | Colonnes principales |
|---|---|---|---|
| `carreaux` | 04 | Un carreau INSEE habité de 200 m | `id_carreau`, `code_commune`, `lat` / `lon`, `population`, `nb_options`, `nb_<type>`, `options_par_habitant`, `niveau_acces`, `couvert_citiz`, `donnee_masquee` |
| `offre_existante` | 04 | Un arrêt ou une station existant | `id_station`, `nom`, `type`, `operateur`, `code_commune`, `lat` / `lon`, `pop_desservie` |
| `candidats_scores` | 05 | Un emplacement possible | `id_candidat`, `type`, `lat` / `lon`, `cout_eur`, `pop_nouvelle`, `adequation`, `score`, `valeur_par_euro` |
| `recommandations` | 05 | Équipements choisis par budget et périmètre | `rang`, `id_candidat`, `type`, `lat` / `lon`, `cout_eur`, `cout_cumule_eur`, `pop_nouvelle`, `score`, `voitures_evitees`, `budget_scenario`, `perimetre` |
| `impacts` | 05 | Résumé par scénario | `perimetre`, `budget_eur`, `nb_equipements`, `habitants_nouvellement_servis`, `voitures_evitees`, `part_pop_<type>_avant` / `_apres` |
| `couts` | 05 | Coût par type d'équipement | `type`, `investissement`, `annuel`, `annees`, `cout_total_eur` |
| `hypotheses` | 04, 05 | Hypothèses et sources | `cle`, `valeur`, `source` |
| `modele_eval` | 05 | Évaluation du modèle | `type`, `n_carreaux`, `n_positifs`, `auc_cv_spatiale` |
| `meta` | 04 | Version des données | `date_maj`, `version`, `rayon_m` |

### Vues pour Power BI

| Vue | Contenu |
|---|---|
| `v_carreaux_acces` | Carreaux non masqués avec un libellé `classe_acces` pour la page Diagnostic |
| `v_stations_bordeaux` | Stations GBFS de Bordeaux, dernière collecte uniquement, avec une colonne `categorie` (Autopartage Citiz, Vélo en station TBM, Vélo / trottinette en libre-service). N'est plus utilisée dans le rapport. |

Script de `v_carreaux_acces` (point de terminaison SQL de LakeHouseZ) :

```sql
CREATE VIEW dbo.v_carreaux_acces AS
SELECT id_carreau, code_commune, lat, lon, population, nb_options,
       options_par_habitant, niveau_acces, couvert_citiz,
       CASE niveau_acces
           WHEN 1 THEN '1 · Aucune option à 5 min'
           WHEN 2 THEN '2 · Accès faible'
           WHEN 3 THEN '3 · Accès moyen'
           WHEN 4 THEN '4 · Bon accès'
           WHEN 5 THEN '5 · Très bon accès'
       END AS classe_acces
FROM dbo.carreaux
WHERE donnee_masquee = 0;
```

## 8. Organisation du dépôt

```
.
├── DATA_SOURCES.md     liste des sources de données
├── README.md           présentation et lancement du projet
├── requirements.txt    dépendances Python
├── src/                code source (collecte dans src/ingestion/)
├── fabric/             notebooks Fabric (fabric/notebooks/), synchronisation GitHub, génération des notebooks
├── backend/            API FastAPI et ses tests
├── tests/              tests de la collecte
├── app/                pages de l'interface de démonstration (Next.js ; components/, lib/, types/ à la racine)
├── notebooks/          exploration (vide pour l'instant)
├── data/               données locales raw/ et processed/ (non versionnées)
├── docs/               documentation technique
└── slides/             présentation
```

## 9. Workflow de développement

- Les notebooks de collecte (`01` à `03`) sont générés depuis `src/ingestion/` par `fabric/build_notebooks.py`. Les notebooks `04` et `05` sont écrits directement dans `fabric/notebooks/`. Tous sont synchronisés dans Fabric avec `00_synchro_github`.
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
4. Exécuter dans l'ordre : `00_synchro_github`, `01_collecte_insee`, `02_collecte_gbfs`, `03_collecte_gtfs`, `04_accessibilite`, `05_score_classement`.
5. Ouvrir le rapport Power BI connecté au Lakehouse.

## 11. Choix techniques

| Choix | Raison |
|---|---|
| Microsoft Fabric | Calcul dans le cloud, stockage partagé, Power BI intégré |
| Lakehouse + Delta | Un seul point de stockage pour tous les notebooks et pour Power BI |
| Flux de tâches Fabric | Pipeline lisible, chaque notebook rattaché à son étape |
| Code dans `src/`, synchronisé depuis GitHub | Code versionné proprement, notebooks toujours à jour |
| Carreaux INSEE 200 m | Maille fine, adaptée à une distance de 5 min à pied |
| Rayon à vol d'oiseau | Simple et rapide à calculer sur toute la zone ; le réseau piéton est une amélioration possible |
| Restriction à Bordeaux Métropole | Volumes maîtrisés, résultats vérifiables, méthode réutilisable |

## 12. Limites et points d'attention

- **Distances** : le rayon de 400 m à vol d'oiseau surestime l'accessibilité (rivières, voies ferrées, impasses) ; un calcul sur le réseau piéton OpenStreetMap serait plus réaliste.
- **Données temps réel** : les flux GBFS donnent l'état à un instant donné ; l'usage réel des stations n'est pas publié.
- **Coûts** : les coûts par équipement sont des estimations (prix du véhicule Citiz à confirmer avec Citiz).
- **Libre-service** : Dott et Pony sont exclus, car leurs « stations » GBFS sont des véhicules ou zones de dépôt dont la position change en permanence.
- **Vie privée** : les carreaux INSEE imputés (`i_est_200`) sont masqués, pour ne pas exposer de petits groupes d'habitants.
- **Équité** : le classement donne 50 % de poids en plus aux habitants sans aucune option à 400 m, pour ne pas favoriser uniquement les quartiers déjà bien équipés.
