# Backend — Mobility Citiz API

API FastAPI qui sert à l'app de démo les données d'accessibilité, les stations existantes et les recommandations d'implantation.

> **État actuel : données factices** (Strasbourg). Le contrat ci-dessous est figé ; seules les fonctions de `app/services/` changeront quand les vraies données arriveront.

## Lancer

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload       # http://localhost:8000
python -m pytest -q                 # tests
```

- Documentation interactive (Swagger) : http://localhost:8000/docs
- Spécification OpenAPI (pour générer des types côté front, ex. `npx openapi-typescript http://localhost:8000/openapi.json -o api.d.ts`) : http://localhost:8000/openapi.json
- CORS : tout `http://localhost:<port>` est autorisé ; autres origines via `CORS_ORIGINS="https://a,https://b"`.

## Organisation

```
app/main.py        création de l'app, CORS, branchement des routers
app/schemas.py     modèles Pydantic = le contrat de l'API
app/routers/       un fichier par endpoint, aucune logique métier
app/services/      la logique (données factices pour l'instant)
tests/             tests des endpoints (TestClient)
```

Pour brancher les vraies données : modifier uniquement `services/coverage_service.py` (lire `data/processed/*.parquet`) et `services/recommendation_service.py` (appeler `recommander(budget, types)`). Les tests vérifient que le contrat est respecté.

## Contrat v1

Coordonnées en WGS84 (EPSG:4326). En GeoJSON, l'ordre est `[longitude, latitude]`.

| Méthode | Route | Rôle | Réponse |
|---|---|---|---|
| GET | `/api/v1/mobility/coverage` | Zones (carreaux 200 m) et indicateurs d'accessibilité | GeoJSON `FeatureCollection` de `Polygon` |
| GET | `/api/v1/stations` | Stations et arrêts existants | GeoJSON `FeatureCollection` de `Point` |
| POST | `/api/v1/recommendations` | Emplacements recommandés selon le budget | JSON (résumé + liste priorisée) |
| GET | `/health` | Vérifier que l'API tourne | `{"status": "ok"}` |

Valeurs autorisées :
- `StationType` : `bus`, `tram`, `bike`, `scooter`, `citiz`
- `EquipmentType` : `citiz_station`, `bus_stop`, `bike_station`

Erreurs : `400` si `bbox` est mal formé, `422` si un paramètre ou le corps ne respecte pas le schéma (détail dans `detail`).

### GET `/api/v1/mobility/coverage`

Paramètres (optionnels) : `bbox=minLon,minLat,maxLon,maxLat`

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Polygon", "coordinates": [[[7.735, 48.575], [7.7377, 48.575], [7.7377, 48.5768], [7.735, 48.5768], [7.735, 48.575]]] },
      "properties": {
        "zone_id": "CRS3035RES200mN2890000E4200000",
        "population": 270,
        "options_count": 1,
        "options_by_type": { "bus": 1, "tram": 0, "bike": 0, "scooter": 0, "citiz": 0 },
        "options_per_1000_inhabitants": 3.7,
        "accessibility_score": 0.1
      }
    }
  ]
}
```

`accessibility_score` est normalisé entre 0 et 1 et sert directement à l'échelle de couleurs froid → chaud.

### GET `/api/v1/stations`

Paramètres (optionnels) : `type` (répétable : `?type=bus&type=citiz`), `bbox`

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [7.734, 48.585] },
      "properties": {
        "station_id": "citiz-gare",
        "name": "Citiz Gare",
        "type": "citiz",
        "operator": "Citiz Grand Est",
        "population_served": 3300
      }
    }
  ]
}
```

### POST `/api/v1/recommendations`

Corps :

```json
{
  "budget": 50000,
  "equipment_types": ["citiz_station", "bus_stop", "bike_station"],
  "max_results": 20
}
```

- `budget` (€, obligatoire, > 0)
- `equipment_types` (optionnel, tous par défaut)
- `max_results` (optionnel, 1–100, défaut 20)

Réponse :

```json
{
  "budget": 50000.0,
  "total_cost": 50000.0,
  "remaining_budget": 0.0,
  "total_population_gained": 8600,
  "recommendations": [
    {
      "rank": 1,
      "location_id": "cand-hautepierre",
      "equipment_type": "citiz_station",
      "lat": 48.5935,
      "lon": 7.699,
      "cost": 15000.0,
      "population_gained": 2900,
      "estimated_value": 0.71
    }
  ]
}
```
