# Backend — Mobility Citiz API

API FastAPI de l'outil d'aide à la décision (zone d'étude : Bordeaux Métropole + Gironde).
Contrat **v1.1.0**, sous le préfixe `/api/v1`.

> **État actuel.** L'API tourne par défaut sur un **jeu de données factice** (`data_mode: "mock"`) : quelques carreaux et stations autour de Bordeaux, uniquement pour développer le frontend. Les populations factices ne sont pas des données INSEE.
> L'analyse d'accessibilité (rôle B), le modèle de recommandation et la table de coûts (rôle C) ne sont **pas encore disponibles** : les champs qui en dépendent valent `null` et les recommandations sont vides. L'API n'invente jamais ces valeurs.

## Lancer

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload       # http://localhost:8000, Swagger sur /docs
python -m pytest -q                 # tests (aucun accès réseau ni Fabric)
```

Spécification OpenAPI : `/openapi.json` (pour générer les types côté front, ex. `npx openapi-typescript http://localhost:8000/openapi.json -o api.d.ts`).

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
app/data/                 chargement des données : mock.py (factice), prepared.py (Parquet), models.py
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
- `area` : `bordeaux_metropole` (défaut) ou `gironde`. Un carreau appartient à la zone si l'une de ses communes en fait partie (liste des 28 communes de Bordeaux Métropole : geo.api.gouv.fr, EPCI 243300316).
- `bbox` : `minLon,minLat,maxLon,maxLat` (WGS84), restreint encore la zone. Un carreau est retenu si son centre est dans la bbox. Format invalide → `400`.

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
Les carreaux sont triés par population décroissante puis par `zone_id`. Au-delà de `limit`, la réponse est tronquée et `meta.truncated` vaut `true` : le front doit inviter à zoomer.

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
- `population` : `ind` arrondi à l'entier.
- `is_estimated` : valeurs imputées par l'INSEE (secret statistique).
- `commune_codes` : codes commune du carreau (il peut en chevaucher plusieurs).
- `options_count`, `options_by_type`, `accessibility_score` : fournis par l'analyse d'accessibilité.
- `options_per_1000_inhabitants` : calculé (`null` si population nulle).
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
  "value_range": { "min": 415.0, "max": 1386.0 },
  "points": [[-0.639887, 44.842547, 415.0], [-0.577243, 44.848933, 1386.0]]
}
```

- `population` est toujours disponible.
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
- `population_served` : fourni par l'analyse d'accessibilité.

### GET `/api/v1/statistics/summary`

Paramètres : `area`, `bbox`.

```json
{
  "meta": { "...": "...", "coverage_thresholds": null },
  "population_total": 5073,
  "zones_count": 15,
  "stations_count": 7,
  "stations_by_type": { "bus": 0, "tram": 3, "metro": 0, "train": 1, "ferry": 1, "bike": 1, "scooter": 0, "carsharing": 0, "citiz": 1, "other": 0 },
  "citiz": {
    "stations_count": 1,
    "stations_per_100k_inhabitants": 19.71,
    "population_within_5min": null,
    "population_within_5min_share": null
  },
  "population_by_coverage_level": null,
  "population_with_any_option": null,
  "population_with_any_option_share": null
}
```

`stations_by_type` compte chaque station une fois, par son type principal. Les champs de couverture restent `null` sans analyse d'accessibilité.

En mode mock, `stations_per_100k_inhabitants` (19,71 dans l'exemple) est calculé sur une population factice : ce n'est **pas** un résultat du projet et ne doit pas être présenté comme tel.

### GET `/api/v1/statistics/population`

Paramètres : `area`, `bbox`, `group_by` : `coverage_level` (défaut), `commune`, `station_type`.

```json
{
  "meta": { "...": "..." },
  "group_by": "commune",
  "available": true,
  "additive": true,
  "population_total": 5073,
  "groups": [
    { "key": "33063", "population": 4658, "share": 0.9182, "zones_count": 12 },
    { "key": "33281", "population": 415, "share": 0.0818, "zones_count": 3 }
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
  "meta": { "...": "...", "recommendations_available": false },
  "budget": 100000.0,
  "total_cost": 0.0,
  "remaining_budget": 100000.0,
  "total_population_gained": 0,
  "recommendations": []
}
```

Format d'une recommandation : `{rank, location_id, equipment_type, lat, lon, cost, population_gained, estimated_value}`.
Sans fichier de candidats, la liste est vide (`recommendations_available: false`). Avec des candidats, l'API applique une **sélection gloutonne** par `estimated_value / cost` dans la limite du budget, sur les valeurs fournies par l'équipe data. Ce n'est pas un modèle prédictif : elle sera remplacée par la fonction `recommander(budget, types)` du rôle C.

Limite connue : cette sélection ne tient pas compte des populations qui se chevauchent. Deux emplacements proches peuvent desservir les mêmes habitants, qui sont alors comptés deux fois dans `total_population_gained`.

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

**Identifiants** (chaînes opaques, à ne pas décomposer côté front) :
- `gtfs:{resource_id}:{stop_id}` et `gbfs:{resource_id}:{station_id}` pour les données réelles ;
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

## Intégration des données réelles (interface provisoire)

En mode `real`, l'API lit trois fichiers dans `DATA_DIR`, préparés en amont (Fabric) et filtrés sur la Gironde. Ils sont chargés une seule fois au démarrage.

**`zones.parquet`** (obligatoire) : un carreau par ligne.
- Obligatoire : `zone_id` (`idcar_200m`), `population`, `is_estimated`, `commune_codes` (liste de textes).
- Optionnel (accessibilité) : `options_count`, `options_<type>` pour chaque type de station, `accessibility_score` (0–1).
- Optionnel : `date_collecte`.

**`stations.parquet`** (obligatoire) : une station par ligne, déjà dédoublonnée.
- Obligatoire : `source` (`gtfs`|`gbfs`), `resource_id`, `native_id`, `name`, `operator`, `lon`, `lat`.
- GTFS : `route_types` (liste). GBFS : `form_factors` (liste), `is_citiz`.
- Optionnel : `capacity`, `population_served`, `date_collecte`.

**`candidates.parquet`** (optionnel) : `location_id`, `equipment_type`, `lon`, `lat`, `cost`, `population_gained`, `estimated_value`.

Les stations et candidats sont rattachés à une zone d'étude par l'emprise de ses carreaux (approximation, en attendant un code commune par station).

Validation au chargement (toute erreur empêche le démarrage, avec le fichier, la ligne et la colonne concernés) :
- une colonne obligatoire absente ou contenant `null` ;
- un `zone_id` qui n'est pas un identifiant INSEE de carreau de 200 m ;
- `is_estimated` ou `is_citiz` qui ne sont pas des booléens ;
- des lignes `gtfs` sans colonne `route_types`, ou des lignes `gbfs` sans colonnes `form_factors` et `is_citiz` (`is_citiz` doit être renseigné sur chaque station GBFS, pour ne jamais classer une station Citiz en `carsharing`) ;
- une valeur invalide (`source`, `equipment_type`, nombre illisible).

Une station sans `route_types` / `form_factors`, ou avec un type inconnu, est conservée en `other` : un seul avertissement est journalisé, avec le décompte par cas et quelques identifiants d'exemple.

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
