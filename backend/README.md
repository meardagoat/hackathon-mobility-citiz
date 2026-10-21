# Backend — Mobility Citiz API

API FastAPI de l'outil d'aide à la décision (zone d'étude : Bordeaux Métropole + Gironde).
Contrat **v1.1.0**, sous le préfixe `/api/v1`.

> **État actuel.** L'API tourne par défaut sur un **jeu de données factice** (`data_mode: "mock"`) : quelques carreaux et stations autour de Bordeaux, uniquement pour développer le frontend. Les populations factices ne sont pas des données INSEE.
> En mode `real`, elle sert les sorties des notebooks `04_accessibilite` et `05_score_classement` (Bordeaux Métropole uniquement, voir [Intégration des données réelles](#intégration-des-données-réelles)). L'API n'invente jamais de valeur : un champ non fourni vaut `null`.

## Lancer

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload                                        # mode mock, http://localhost:8000
DATA_MODE=real DATA_DIR=/chemin/vers/gold uvicorn app.main:app --reload   # mode real
python -m pytest -q                                                  # tests (aucun accès réseau ni Fabric)
```

Pour garder sa configuration dans un fichier : `cp .env.example .env`, l'éditer, puis `uvicorn app.main:app --reload --env-file .env` (`.env` n'est pas versionné).

- Swagger : `http://localhost:8000/docs`, spécification OpenAPI : `http://localhost:8000/openapi.json` (pour générer les types côté front, ex. `npx openapi-typescript http://localhost:8000/openapi.json -o api.d.ts`).
- `GET /health` répond `{"status": "ok"}` dès que l'API accepte des requêtes : les données sont chargées au démarrage, qui échoue si elles sont invalides.
- CORS : toute origine `http://localhost:<port>` ou `http://127.0.0.1:<port>` est acceptée (ex. un front sur `http://localhost:3000`). Pour un front déployé, lister ses origines exactes dans `CORS_ORIGINS`. Pas de cookies ni d'authentification.

### Configuration (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `DATA_MODE` | `mock` | `mock` (données factices) ou `real` (fichiers préparés, voir plus bas) |
| `DATA_DIR` | `<repo>/data/processed` | Dossier des fichiers Parquet préparés (mode `real`) |
| `COVERAGE_LOW_MAX`, `COVERAGE_MEDIUM_MAX` | non définis | Seuils des niveaux de couverture (les deux ensemble). Non définis → `coverage_level` = `null` |
| `CORS_ORIGINS` | – | Origines autorisées en plus de `http://localhost:*` (séparées par des virgules) |

En mode `real`, un fichier ou une colonne manquante **empêche le démarrage** avec un message explicite : il n'y a pas de repli silencieux sur les données factices.

## Organisation

```
app/main.py               application, CORS, gzip, chargement des données au démarrage
app/schemas.py            modèles Pydantic = le contrat de l'API
app/routers/              un fichier par groupe d'endpoints, aucune logique métier
app/services/             logique : sélection par zone, couverture, heatmap, statistiques, recommandations
app/data/                 chargement des données : mock.py (factice), prepared.py (Parquet), population.py (populations sans carreaux masqués), models.py
app/validation.py         zones couvertes par les données, erreurs 422
app/station_types.py      correspondance GTFS / GBFS → types de station, identifiants
app/coverage_levels.py    niveaux de couverture (source unique pour la carte et les statistiques)
app/geo.py                carreaux INSEE : polygone et centre à partir de idcar_200m
app/areas.py              zones d'étude (communes de Bordeaux Métropole, département 33)
```

## Endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/v1/mobility/coverage` | Carreaux de 200 m détaillés (GeoJSON, polygones) |
| GET | `/api/v1/mobility/heatmap` | Couche légère `[lon, lat, valeur]` pour toute la zone |
| GET | `/api/v1/stations` | Arrêts et stations existants (GeoJSON, points) |
| GET | `/api/v1/statistics/summary` | Indicateurs globaux de la zone |
| GET | `/api/v1/statistics/population` | Population regroupée par niveau de couverture, commune ou type de station |
| POST | `/api/v1/recommendations` | Emplacements recommandés sous contrainte de budget |
| GET | `/health` | `{"status": "ok"}` |

Paramètres communs aux GET :
- `area` : `bordeaux_metropole` (défaut) ou `gironde`. Un carreau appartient à la zone si l'une de ses communes en fait partie, une station ou une recommandation si son `code_commune` en fait partie (liste des 28 communes de Bordeaux Métropole : geo.api.gouv.fr, EPCI 243300316). Les données réelles ne couvrent que Bordeaux Métropole : en mode `real`, `area=gironde` renvoie `422` (`loc: ["query", "area"]` ou `["body", "area"]`).
- `bbox` : `minLon,minLat,maxLon,maxLat` (WGS84), restreint encore la zone. Un carreau est retenu si son centre est dans la bbox, une station si sa position y est. Format invalide → `400`.

Erreurs : `400` (bbox invalide), `422` (paramètre ou corps hors contrat, détail dans `detail`).

### Objet `meta`

Présent dans toutes les réponses (sauf `/health`) :

```json
{
  "api_version": "1.1.0",
  "data_mode": "mock",
  "area": "bordeaux_metropole",
  "data_collected_at": null,
  "accessibility_available": false,
  "recommendations_available": false
}
```

- `data_mode` : `mock` (données factices) ou `real` (fichiers préparés).
- `data_collected_at` : date de collecte des données réelles (`null` en mode mock ou si inconnue).
- `accessibility_available` / `recommendations_available` : indiquent si les champs dérivés seront renseignés ou `null`.
- Les collections (coverage, heatmap, stations) ajoutent `total_features`, `returned_features` et `truncated`.

### GET `/api/v1/mobility/coverage`

Paramètres : `area`, `bbox`, `limit` (1–5000, défaut 5000), `coverage_level` (répétable).
Les carreaux sont triés par population décroissante puis par `zone_id`, les carreaux masqués en dernier (par `zone_id`). Au-delà de `limit`, la réponse est tronquée et `meta.truncated` vaut `true` : le front doit inviter à zoomer.

Tant que les seuils de couverture ne sont pas configurés, `coverage_level` vaut `null` partout : un filtre `coverage_level` renvoie alors **aucun carreau**.

```json
{
  "type": "FeatureCollection",
  "meta": { "api_version": "1.1.0", "data_mode": "mock", "area": "bordeaux_metropole", "data_collected_at": null,
            "accessibility_available": false, "recommendations_available": false,
            "total_features": 15, "returned_features": 1, "truncated": true },
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Polygon", "coordinates": [[[-0.573993, 44.851988], [-0.571487, 44.852243], [-0.571826, 44.854025], [-0.574332, 44.853771], [-0.573993, 44.851988]]] },
      "properties": {
        "zone_id": "CRS3035RES200mN2474800E3486800",
        "population": 529,
        "is_estimated": false,
        "commune_codes": ["33063"],
        "options_count": null,
        "options_by_type": null,
        "options_per_1000_inhabitants": null,
        "accessibility_score": null,
        "coverage_level": null
      }
    }
  ]
}
```

- `zone_id` : identifiant INSEE `idcar_200m`.
- `population` : `ind` arrondi à l'entier ; `null` si `is_estimated` (voir [Carreaux masqués](#carreaux-masqués)).
- `is_estimated` : carreau masqué (valeurs imputées par l'INSEE, secret statistique).
- `commune_codes` : codes commune du carreau (il peut en chevaucher plusieurs).
- `options_count`, `options_by_type`, `accessibility_score` : fournis par l'analyse d'accessibilité.
- `options_per_1000_inhabitants` : calculé (`null` si population nulle ou carreau masqué).
- `coverage_level` : voir « Niveaux de couverture ».

### GET `/api/v1/mobility/heatmap`

Paramètres : `area`, `bbox`, `metric` (`population` par défaut, `accessibility_score`, `underserved_population`), `resolution` (`200m` par défaut, `1km`).
Contrairement à `coverage`, pas de polygones ni de plafond : un point par carreau (ou par carreau de 1 km : population sommée, score moyen pondéré par la population).

```json
{
  "meta": { "...": "...", "total_features": 2, "returned_features": 2, "truncated": false },
  "metric": "population",
  "resolution": "1km",
  "metric_available": true,
  "masked_zones_count": 1,
  "value_range": { "min": 403.0, "max": 1386.0 },
  "points": [[-0.639887, 44.842547, 403.0], [-0.577243, 44.848933, 1386.0]]
}
```

- `population` est toujours disponible. `population` et `underserved_population` excluent les carreaux masqués : un carreau de 200 m masqué n'a pas de point, et un carreau de 1 km ne contenant que des carreaux masqués non plus. `masked_zones_count` : carreaux masqués de la sélection.
- `accessibility_score` et `underserved_population` (population des carreaux sans aucune option) demandent l'analyse d'accessibilité. Sinon : `metric_available: false`, `points: []` et `value_range: null`.

### GET `/api/v1/stations`

Paramètres : `type` (répétable), `area`, `bbox`, `limit` (1–50000, défaut 20000). Tri par `station_id`.
Le filtre `type` retient une station si **l'un de ses modes** est demandé.

```json
{
  "type": "FeatureCollection",
  "meta": { "...": "...", "total_features": 1, "returned_features": 1, "truncated": false },
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-0.556, 44.8257] },
      "properties": {
        "station_id": "mock:gare-saint-jean",
        "name": "Gare Saint-Jean",
        "type": "train",
        "modes": ["train", "tram", "bus"],
        "operator": "SNCF / TBM",
        "source": "mock",
        "capacity": null,
        "population_served": null
      }
    }
  ]
}
```

- `type` : mode principal (affichage), `modes` : tous les modes desservant l'arrêt.
- `source` : `gtfs`, `gbfs` ou `mock`.
- `capacity` : places GBFS (`null` pour un arrêt GTFS).
- `population_served` : habitants des carreaux **non masqués** dont le centre est à moins de `rayon_m` (400 m à vol d'oiseau) de la station, recalculé par l'API (`pop_desservie` de la couche data inclut les carreaux masqués et n'est pas renvoyé). `null` en mode mock.
- En mode `real`, un arrêt desservi par plusieurs modes apparaît une fois par mode, avec des identifiants distincts, comme dans la couche data.

### GET `/api/v1/statistics/summary`

Paramètres : `area`, `bbox`.

```json
{
  "meta": { "...": "...", "coverage_thresholds": null },
  "population_total": 5061,
  "zones_count": 15,
  "masked_zones_count": 1,
  "stations_count": 7,
  "stations_by_type": { "bus": 0, "tram": 3, "metro": 0, "train": 1, "ferry": 1, "bike": 1, "scooter": 0, "carsharing": 0, "citiz": 1, "other": 0 },
  "citiz": {
    "stations_count": 1,
    "stations_per_100k_inhabitants": 19.76,
    "population_within_5min": null,
    "population_within_5min_share": null
  },
  "population_by_coverage_level": null,
  "population_with_any_option": null,
  "population_with_any_option_share": null
}
```

`stations_by_type` compte chaque station une fois, par son type principal. Les champs de couverture restent `null` sans analyse d'accessibilité.

En mode mock, `stations_per_100k_inhabitants` (19,76 dans l'exemple) est calculé sur une population factice : ce n'est **pas** un résultat du projet et ne doit pas être présenté comme tel.

### GET `/api/v1/statistics/population`

Paramètres : `area`, `bbox`, `group_by` : `coverage_level` (défaut), `commune`, `station_type`.

```json
{
  "meta": { "...": "..." },
  "group_by": "commune",
  "available": true,
  "additive": true,
  "population_total": 5061,
  "masked_zones_count": 1,
  "groups": [
    { "key": "33063", "population": 4658, "share": 0.9204, "zones_count": 12, "masked_zones_count": 0 },
    { "key": "33281", "population": 403, "share": 0.0796, "zones_count": 3, "masked_zones_count": 1 }
  ]
}
```

- `commune` : toujours disponible. Un carreau sur plusieurs communes est rattaché au premier code de `commune_codes`.
- `coverage_level` : les 4 niveaux, dans l'ordre `none`, `low`, `medium`, `high`. Mêmes valeurs que `population_by_coverage_level` du résumé.
- `station_type` : population à 5 min d'au moins une option de chaque type. Les groupes se chevauchent : `additive: false`.
- Sans les données nécessaires : `available: false` et `groups: []`.

### POST `/api/v1/recommendations`

```json
{ "budget": 100000, "equipment_types": ["citiz_station", "bus_stop", "bike_station"], "max_results": 20, "area": "bordeaux_metropole" }
```

`budget` en euros (> 0, obligatoire). `equipment_types` (au moins un, tous par défaut), `max_results` (1–100), `area` : optionnels.

```json
{
  "meta": { "...": "...", "recommendations_available": true },
  "budget": 100000.0,
  "perimeter": "citiz",
  "total_cost": 68000.0,
  "remaining_budget": 32000.0,
  "total_population_gained": 450,
  "population_gained_by_type": { "citiz_station": 450 },
  "recommendations": [
    {
      "rank": 1, "location_id": "citiz_CRS3035RES200mN2474000E3486600", "equipment_type": "citiz_station",
      "lat": 44.84, "lon": -0.57, "commune_code": "33069",
      "cost": 34000.0, "cumulative_cost": 34000.0, "population_gained": 300,
      "estimated_value": null, "score": 100.0, "adequation": 0.8, "cars_avoided": 8
    }
  ]
}
```

**Mode `real`** : l'API renvoie le classement précalculé par le notebook `05_score_classement` (table `recommandations`), sans le recalculer.
- `budget` doit être l'un des scénarios publiés : `100000`, `250000`, `500000`, `1000000`. Toute autre valeur → `422` (`loc: ["body", "budget"]`), sans arrondi.
- `equipment_types` choisit le périmètre : les trois types → `tous`, `["citiz_station"]` seul → `citiz`. Toute autre combinaison → `422` (`loc: ["body", "equipment_types"]`).
- Résultats triés par `rank`, tronqués à `max_results` ; les totaux portent sur les lignes renvoyées. Un scénario publié sans ligne renvoie une liste vide.
- `cost` et `cumulative_cost` sont des coûts sur **3 ans** (investissement + fonctionnement, voir table `couts`).
- `population_gained` : habitants des carreaux **non masqués** à moins de `rayon_m` (400 m à vol d'oiseau) nouvellement couverts par ce type d'équipement, sans double compte avec les rangs précédents **du même type**. L'API le recalcule à partir des carreaux selon la méthode du notebook 05 (`pop_nouvelle` inclut les carreaux masqués et n'est pas renvoyé). Un habitant couvert par une nouvelle station Citiz et un nouvel arrêt de bus est compté dans les deux types : `population_gained_by_type` donne la somme par type, et `total_population_gained` vaut `null` pour le périmètre `tous` (aucun total sans double compte n'est publié).
- `score` : valeur ajoutée au moment du choix, relative au meilleur candidat (0–100). `adequation` : probabilité du modèle (0–1). `cars_avoided` : 8 par station Citiz, 0 sinon (hypothèse de la couche data). `estimated_value` vaut `null`.

**Mode `mock`** : sélection gloutonne par `estimated_value / cost` sur les candidats, quel que soit le budget. Sans candidats, la liste est vide (`recommendations_available: false`). `perimeter`, `population_gained_by_type`, `score`, `adequation` et `cars_avoided` valent `null`. Cette sélection ne tient pas compte des populations qui se chevauchent : `total_population_gained` peut compter deux fois les mêmes habitants.

## Types de station

`bus`, `tram`, `metro`, `train`, `ferry`, `bike`, `scooter`, `carsharing`, `citiz`, `other`.

| GTFS `route_type` | Type |
|---|---|
| 0, 900–906 | `tram` |
| 1, 400–404 | `metro` |
| 2, 100–117 | `train` |
| 3, 11, 200–209, 700–716, 800 | `bus` |
| 4, 1000, 1200 | `ferry` |
| autre | `other` |

| GBFS `form_factor` | Type |
|---|---|
| `bicycle`, `cargo_bicycle` | `bike` |
| `scooter`, `scooter_standing`, `scooter_seating`, `moped` | `scooter` |
| `car` | `carsharing` (`citiz` si la station est Citiz) |
| autre | `other` |

Une station Citiz a toujours le mode `citiz`. Un type inconnu devient `other` (la station est conservée) et est signalé dans les logs au chargement.
Type principal, par priorité : `citiz` > `carsharing` > `train` > `metro` > `tram` > `ferry` > `bus` > `bike` > `scooter` > `other`.

En mode `real`, le type vient directement de la couche data (voir [Intégration des données réelles](#intégration-des-données-réelles)) : chaque station a un seul mode.

**Identifiants** (chaînes opaques, à ne pas décomposer côté front) :
- `id_station` de la couche data, repris tel quel (`gtfs_…`, `gbfs_…`) pour les données réelles ;
- `mock:{nom}` pour les données factices.

## Géométrie

- GeoJSON (RFC 7946), WGS84, `[longitude, latitude]`, 6 décimales.
- Carreaux : `Polygon` à un anneau fermé de 5 positions, calculé exactement depuis `idcar_200m` (coin sud-ouest en EPSG:3035, côté de 200 m) avec pyproj.
- Stations : `Point`.
- Heatmap : pas de GeoJSON, tableaux compacts `[lon, lat, valeur]`.

## Niveaux de couverture

Calculés à partir de `options_count` (options de mobilité à 5 min à pied) dans `app/coverage_levels.py`, utilisé à la fois par la carte et par les statistiques :

| Niveau | Règle |
|---|---|
| `none` | 0 option |
| `low` | 1 à `COVERAGE_LOW_MAX` |
| `medium` | jusqu'à `COVERAGE_MEDIUM_MAX` |
| `high` | au-delà |

Les seuils ne sont **pas encore décidés** : tant qu'ils ne sont pas configurés, `coverage_level` vaut `null`. Une fois définis, ils sont renvoyés dans `meta.coverage_thresholds` du résumé pour construire la légende.

## Intégration des données réelles

En mode `real`, l'API lit dans `DATA_DIR` les fichiers Parquet produits par les notebooks `04_accessibilite` et `05_score_classement` (`Files/gold/` du Lakehouse, schéma dans `docs/DATA_CONTRACT.md`). Ils sont chargés une seule fois au démarrage. Les exports JSON ne sont pas utilisés.

| Fichier | Modèle interne | Correspondance |
|---|---|---|
| `carreaux.parquet` | `Zone` | `id_carreau` → `zone_id`, `code_commune` → `commune_codes`, `population`, `donnee_masquee` → `is_estimated`, `nb_options` → `options_count`, `nb_<type>` → `options_by_type` |
| `offre_existante.parquet` | `Station` | `id_station` (repris tel quel), `nom`, `type` (mode unique), `operateur`, `code_commune`, `lat`, `lon` ; `source` déduite du préfixe `gtfs_` / `gbfs_` ; `population_served` recalculé (`pop_desservie` validé mais non utilisé) |
| `recommandations.parquet` | `PrecomputedRecommendation` | servi tel quel par `POST /recommendations` |
| `meta.parquet` | `meta.data_collected_at`, rayon | `date_maj` (date la plus récente), `rayon_m` (rayon d'accessibilité, unique) |

Types de la couche data : `bus`, `tram`, `metro`, `train`, `bateau` → `ferry`, `velo` → `bike`, `citiz`. Équipements des recommandations : `bus` → `bus_stop`, `velo` → `bike_station`, `citiz` → `citiz_station`. `accessibility_score` reste `null` (non produit) et `capacity` aussi.

`candidats_scores.parquet` n'est pas lu : aucun endpoint n'en a besoin.

Validation au chargement (toute erreur empêche le démarrage, avec le fichier, la ligne et la colonne concernés) :
- fichier ou colonne obligatoire absent, valeur obligatoire `null` ;
- `id_carreau` qui n'est pas un carreau INSEE de 200 m, `id_carreau` ou `id_station` en double ;
- `donnee_masquee` qui n'est pas un booléen, `code_commune` qui n'a pas 5 caractères ;
- type de station ou d'équipement inconnu, colonne `nb_<type>` inconnue ou absente pour un type présent dans `offre_existante`, `nb_options` différent de la somme des `nb_<type>` ;
- `id_station` sans préfixe `gtfs_` ou `gbfs_`, coordonnées hors WGS84 ;
- recommandations : périmètre inconnu (`tous`, `citiz`), équipement hors du périmètre, `score` hors de 0–100 ou `adequation` hors de 0–1 (ou non finis), rangs non continus à partir de 1, candidat en double, `cout_cumule_eur` différent du cumul des `cout_eur`, total supérieur à `budget_scenario` ;
- `id_candidat` qui n'est pas `<type>_<id_carreau>` ;
- `date_maj` sans fuseau horaire, `rayon_m` absent, nul ou différent selon les lignes.

Au chargement, l'API recalcule `pop_nouvelle` à partir des carreaux (masqués compris) et journalise un avertissement si le résultat diffère : c'est le cas avec une table de carreaux incomplète (échantillons). Sur l'export complet, aucun écart n'est attendu.

Rattachement à la zone : `code_commune` pour les stations et les recommandations (commune du carreau habité le plus proche, selon la couche data). Seule `bordeaux_metropole` est couverte.

### Valider l'export complet

Nécessite un accès en lecture à `LakeHouseZ` (espace `HackathonZ`).

1. Copier `carreaux.parquet`, `offre_existante.parquet`, `recommandations.parquet` et `meta.parquet` depuis `Files/gold/` (explorateur du Lakehouse → Télécharger, ou OneLake file explorer) dans un dossier hors du dépôt.
2. Lancer l'API sur ce dossier :
   ```bash
   DATA_MODE=real DATA_DIR=/chemin/vers/gold .venv/bin/uvicorn app.main:app
   ```
3. Vérifier le journal de démarrage : aucun avertissement `pop_nouvelle could not be reproduced` (sinon, il liste le scénario, le rang, l'identifiant, la valeur publiée et la valeur recalculée).
4. Vérifier `GET /api/v1/statistics/summary` : `zones_count` (6 644 attendus pour l'export du 2026-10-20), `masked_zones_count`, `stations_count`.

## Carreaux masqués

Un carreau `donnee_masquee` (INSEE `i_est_200 = 1`, moins de 11 ménages) a `is_estimated: true`. Le Parquet contient sa population imputée par l'INSEE : l'API ne la renvoie jamais, ni directement ni par un calcul. Même règle en mode mock.

- `coverage` : `population` et `options_per_1000_inhabitants` valent `null` ; identifiant, géométrie, communes, `options_count`, `options_by_type` et `coverage_level` restent renvoyés (ils ne dépendent pas de la population).
- Totaux et parts (`summary`, `population`, `heatmap`) : **population des carreaux non masqués uniquement**. `masked_zones_count` indique combien de carreaux de la sélection en sont exclus ; `zones_count` les compte. Les parts (`share`, `population_within_5min_share`…) et `stations_per_100k_inhabitants` sont calculées sur cette même base.
- `population_served` (stations) et `population_gained` (recommandations) : recalculés sans les carreaux masqués.
- Le tri de `coverage` n'utilise pas leur population.

Limites : les totaux sont des minorants de la population réelle. `score` et `adequation` des recommandations sont calculés par la couche data avec toutes les populations ; ils ne permettent pas de retrouver une population masquée sans les paramètres internes du modèle, mais ce n'est pas une garantie formelle.

## Décisions en attente

Avec Komlan (frontend) :
- validation des changements cassants de la v1.1 (voir ci-dessous) et icônes / couleurs des 10 types ;
- plafond de 5 000 carreaux avec troncature, ou erreur ;
- format compact de la heatmap ;
- couleurs des niveaux de couverture.

Avec l'équipe data :
- format définitif des trois fichiers et table de coûts ;
- seuils des niveaux de couverture, 5 min = 400 m à vol d'oiseau ou réseau piéton OSM ;
- prise en compte des véhicules en free-floating ;
- comptage de `other` dans `options_count` ;
- règles de dédoublonnage des arrêts (quais / stations parentes, arrêts présents dans plusieurs réseaux) ;
- rattachement des carreaux à plusieurs communes, source des noms de communes ;
- affichage des carreaux `is_estimated`.

## Changements par rapport à la v1

Cassants :
- nouveaux types de station (`metro`, `train`, `ferry`, `carsharing`, `other`) ;
- `options_count`, `options_by_type`, `options_per_1000_inhabitants`, `accessibility_score`, `population_served` peuvent valoir `null` ;
- `coverage` sans `bbox` est limité à Bordeaux Métropole et plafonné à 5 000 carreaux ;
- format des identifiants de station ;
- le filtre `type` porte sur `modes` ;
- les données factices passent de Strasbourg à Bordeaux et ne contiennent plus de recommandations ni de valeurs d'accessibilité.

Ajouts : `meta`, `modes`, `source`, `capacity`, `is_estimated`, `commune_codes`, `coverage_level`, paramètres `area` et `limit`, endpoints `heatmap`, `statistics/summary`, `statistics/population`, compression gzip.

## Différences entre `mock` et `real`

| | `mock` | `real` |
|---|---|---|
| Données | factices (Bordeaux, Mérignac, Libourne) | sorties des notebooks 04 et 05 |
| `area` | `bordeaux_metropole`, `gironde` | `bordeaux_metropole` seulement (`gironde` → `422`) |
| Accessibilité (`options_*`, `coverage_level`, `population_served`) | `null` | renseignée ; 400 m à vol d'oiseau depuis le centre du carreau, pas un itinéraire piéton |
| `accessibility_score` | `null` | `null` (non produit) |
| `station_id` | `mock:{nom}` | `id_station` de la couche data ; un arrêt multimodal = une station par mode |
| Recommandations | sélection gloutonne sur les candidats (aucun candidat : liste vide), budget libre | classement précalculé, budgets `100000`, `250000`, `500000`, `1000000`, périmètres `tous` / `citiz` |
| `estimated_value` | valeur du candidat | `null` |
| `score`, `adequation`, `cars_avoided`, `perimeter`, `population_gained_by_type` | `null` | renseignés |
| Coûts | valeurs des candidats | coûts sur 3 ans |
| Carreaux masqués | règle identique | règle identique |

## Changements depuis la v1.1

Cassants :
- `recommendations[].estimated_value` peut valoir `null` (toujours `null` en mode `real`) ;
- `total_population_gained` peut valoir `null` (périmètre `tous` en mode `real`) ;
- en mode `real` : `budget` limité aux scénarios publiés, `equipment_types` limité aux deux périmètres, `area=gironde` refusé (`422`).

Ajouts : `perimeter` et `population_gained_by_type` dans la réponse des recommandations ; `commune_code`, `cumulative_cost`, `score`, `adequation`, `cars_avoided` dans chaque recommandation.

Carreaux masqués :
- cassant : `coverage.features[].properties.population` peut valoir `null` ;
- les totaux de population excluent les carreaux masqués, y compris en mode mock ;
- ajout de `masked_zones_count` dans `heatmap`, `statistics/summary`, `statistics/population` et chaque groupe de `statistics/population`.
