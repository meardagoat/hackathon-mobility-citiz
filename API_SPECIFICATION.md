# Spécification API - Hackathon Mobilité

**Version:** 1.0  
**Base URL:** `http://localhost:8000/api/v1`

---

## 📋 Table des matières

1. [Mobilité & Couverture](#1-mobilité--couverture)
2. [Stations & Arrêts](#2-stations--arrêts)
3. [Statistiques](#3-statistiques)
4. [Recommandations](#4-recommandations)
5. [Régions & Métadonnées](#5-régions--métadonnées)
6. [Codes d'erreur](#6-codes-derreur)

---

## 1. Mobilité & Couverture

### 1.1 Obtenir la couverture de mobilité

**Endpoint:** `GET /mobility/coverage`

**Description:** Renvoie les zones géographiques avec leurs indicateurs d'accessibilité à la mobilité.

**Paramètres de requête:**

| Paramètre | Type | Requis | Description | Exemple |
|-----------|------|--------|-------------|---------|
| `region` | string | Non | Code région ou nom de ville | `ile-de-france` |
| `min_coverage` | float | Non | Score minimal de couverture (0-1) | `0.5` |
| `transport_types` | string | Non | Types séparés par virgule | `bus,bike,carsharing` |
| `resolution` | string | Non | Résolution de la grille | `200m`, `iris`, `commune` |

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": "zone_001",
        "type": "grid_200m",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[2.3522, 48.8566], [2.3532, 48.8566], [2.3532, 48.8576], [2.3522, 48.8576], [2.3522, 48.8566]]]
        },
        "properties": {
          "population": 450,
          "coverage_score": 0.85,
          "transport_options": 12,
          "options_per_inhabitant": 0.027,
          "transport_types": {
            "bus": 5,
            "metro": 2,
            "bike": 3,
            "carsharing": 2
          },
          "walking_time_avg": 3.2
        }
      }
    ],
    "metadata": {
      "total_zones": 15420,
      "region": "Île-de-France",
      "timestamp": "2026-10-19T15:30:00Z"
    }
  }
}
```

---

### 1.2 Obtenir les données de heat map

**Endpoint:** `GET /mobility/heatmap`

**Description:** Données optimisées pour l'affichage de la carte de chaleur (heat map).

**Paramètres de requête:**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `region` | string | Non | Région à afficher |
| `bounds` | string | Non | Bounding box: `min_lng,min_lat,max_lng,max_lat` |
| `metric` | string | Non | Métrique: `coverage_score`, `options_per_inhabitant`, `population` |

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [2.3522, 48.8566]
        },
        "properties": {
          "intensity": 0.85,
          "population": 450,
          "transport_options": 12
        }
      }
    ],
    "legend": {
      "min": 0,
      "max": 1,
      "colors": ["#0000ff", "#00ff00", "#ffff00", "#ff0000"],
      "labels": ["Très faible", "Faible", "Moyen", "Bon", "Excellent"]
    }
  }
}
```

---

### 1.3 Obtenir les types de mobilité

**Endpoint:** `GET /mobility/types`

**Description:** Liste des types de mobilité disponibles dans les données.

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "types": [
      {
        "id": "bus",
        "name": "Bus",
        "icon": "bus",
        "color": "#3b82f6",
        "total_stations": 8450
      },
      {
        "id": "metro",
        "name": "Métro",
        "icon": "train",
        "color": "#ef4444",
        "total_stations": 302
      },
      {
        "id": "tram",
        "name": "Tramway",
        "icon": "tram",
        "color": "#10b981",
        "total_stations": 245
      },
      {
        "id": "bike",
        "name": "Vélo partagé",
        "icon": "bike",
        "color": "#f59e0b",
        "total_stations": 1834
      },
      {
        "id": "carsharing",
        "name": "Autopartage",
        "icon": "car",
        "color": "#8b5cf6",
        "total_stations": 456
      },
      {
        "id": "scooter",
        "name": "Trottinette",
        "icon": "scooter",
        "color": "#ec4899",
        "total_stations": 892
      }
    ]
  }
}
```

---

## 2. Stations & Arrêts

### 2.1 Lister les stations

**Endpoint:** `GET /stations`

**Description:** Liste des stations et arrêts de transport.

**Paramètres de requête:**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `type` | string | Non | Type de transport |
| `region` | string | Non | Région |
| `bounds` | string | Non | Bounding box |
| `min_population` | integer | Non | Population min. desservie |
| `limit` | integer | Non | Nombre max de résultats (défaut: 100) |
| `offset` | integer | Non | Décalage pour pagination |

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "stations": [
      {
        "id": "station_001",
        "name": "Gare Saint-Lazare",
        "type": "train",
        "operator": "SNCF",
        "location": {
          "type": "Point",
          "coordinates": [2.3255, 48.8759]
        },
        "population_served": 15420,
        "walking_radius_m": 400,
        "lines": ["RER E", "Metro 3", "Metro 12", "Metro 13", "Metro 14"],
        "status": "active",
        "capacity": null
      },
      {
        "id": "station_002",
        "name": "Citiz - République",
        "type": "carsharing",
        "operator": "Citiz",
        "location": {
          "type": "Point",
          "coordinates": [2.3636, 48.8675]
        },
        "population_served": 3240,
        "walking_radius_m": 400,
        "status": "active",
        "capacity": 4,
        "vehicles_available": 2
      }
    ],
    "pagination": {
      "total": 12450,
      "limit": 100,
      "offset": 0,
      "has_more": true
    }
  }
}
```

---

### 2.2 Obtenir le détail d'une station

**Endpoint:** `GET /stations/{station_id}`

**Description:** Informations détaillées sur une station spécifique.

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "station_001",
    "name": "Gare Saint-Lazare",
    "type": "train",
    "operator": "SNCF",
    "location": {
      "type": "Point",
      "coordinates": [2.3255, 48.8759]
    },
    "address": "13 Rue d'Amsterdam, 75008 Paris",
    "population_served": 15420,
    "walking_radius_m": 400,
    "lines": ["RER E", "Metro 3", "Metro 12", "Metro 13", "Metro 14"],
    "status": "active",
    "nearby_amenities": {
      "shops": 45,
      "offices": 128,
      "housing_units": 3240
    },
    "coverage_area": {
      "type": "Polygon",
      "coordinates": [[[2.3200, 48.8720], [2.3310, 48.8720], [2.3310, 48.8798], [2.3200, 48.8798], [2.3200, 48.8720]]]
    },
    "accessibility": {
      "wheelchair": true,
      "elevator": true,
      "audio_guidance": true
    }
  }
}
```

---

## 3. Statistiques

### 3.1 Statistiques globales

**Endpoint:** `GET /statistics/summary`

**Description:** Vue d'ensemble des statistiques de mobilité.

**Paramètres de requête:**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `region` | string | Non | Région spécifique |

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "region": "Île-de-France",
    "population": {
      "total": 12_278_210,
      "covered": 11_450_380,
      "coverage_rate": 0.93
    },
    "stations": {
      "total": 12_450,
      "by_type": {
        "bus": 8450,
        "metro": 302,
        "tram": 245,
        "bike": 1834,
        "carsharing": 456,
        "scooter": 892
      }
    },
    "accessibility": {
      "well_served": 0.65,
      "moderately_served": 0.28,
      "poorly_served": 0.07
    },
    "avg_options_per_inhabitant": 0.042,
    "avg_walking_time_minutes": 4.2
  }
}
```

---

### 3.2 Statistiques de population

**Endpoint:** `GET /statistics/population`

**Description:** Répartition de la population par niveau de couverture.

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "distribution": [
      {
        "coverage_range": "0-0.2",
        "label": "Très faible",
        "population": 856_000,
        "percentage": 7,
        "color": "#dc2626"
      },
      {
        "coverage_range": "0.2-0.4",
        "label": "Faible",
        "population": 1_227_821,
        "percentage": 10,
        "color": "#f59e0b"
      },
      {
        "coverage_range": "0.4-0.6",
        "label": "Moyen",
        "population": 3_439_099,
        "percentage": 28,
        "color": "#fbbf24"
      },
      {
        "coverage_range": "0.6-0.8",
        "label": "Bon",
        "percentage": 35,
        "population": 4_297_374,
        "color": "#84cc16"
      },
      {
        "coverage_range": "0.8-1.0",
        "label": "Excellent",
        "population": 2_457_916,
        "percentage": 20,
        "color": "#22c55e"
      }
    ],
    "by_region": [
      {
        "region": "Paris",
        "avg_coverage": 0.89,
        "population": 2_165_423
      },
      {
        "region": "Hauts-de-Seine",
        "avg_coverage": 0.81,
        "population": 1_624_357
      }
    ]
  }
}
```

---

## 4. Recommandations

### 4.1 Obtenir les recommandations

**Endpoint:** `POST /recommendations`

**Description:** Calcule et renvoie les emplacements recommandés pour de nouvelles stations.

**Corps de la requête:**

```json
{
  "region": "ile-de-france",
  "budget": 500000,
  "transport_types": ["carsharing", "bike"],
  "constraints": {
    "min_population": 1000,
    "max_distance_existing": 800,
    "prioritize": "underserved_areas"
  },
  "cost_estimates": {
    "carsharing": 50000,
    "bike": 30000,
    "bus": 100000
  }
}
```

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "rec_001",
        "rank": 1,
        "location": {
          "type": "Point",
          "coordinates": [2.4021, 48.8473]
        },
        "address": "Avenue de la République, Montreuil",
        "transport_type": "carsharing",
        "estimated_cost": 50000,
        "impact": {
          "new_population_served": 4850,
          "coverage_improvement": 0.045,
          "existing_coverage": 0.32,
          "projected_coverage": 0.365
        },
        "justification": "Zone densément peuplée avec faible couverture actuelle. Proximité avec ligne de métro 9.",
        "score": 0.92,
        "nearby_facilities": {
          "metro_stations": 1,
          "bus_stops": 3,
          "residential_density": "high"
        }
      },
      {
        "id": "rec_002",
        "rank": 2,
        "location": {
          "type": "Point",
          "coordinates": [2.2912, 48.8589]
        },
        "address": "Place de la Défense, Puteaux",
        "transport_type": "bike",
        "estimated_cost": 30000,
        "impact": {
          "new_population_served": 3240,
          "coverage_improvement": 0.038,
          "existing_coverage": 0.58,
          "projected_coverage": 0.618
        },
        "justification": "Zone d'affaires avec forte demande potentielle. Complète l'offre existante.",
        "score": 0.87,
        "nearby_facilities": {
          "metro_stations": 2,
          "offices": 156,
          "residential_density": "medium"
        }
      }
    ],
    "summary": {
      "total_recommendations": 12,
      "total_cost": 500000,
      "total_new_population": 28450,
      "avg_coverage_improvement": 0.042,
      "budget_used": 490000,
      "budget_remaining": 10000
    },
    "optimization_method": "genetic_algorithm",
    "computation_time_ms": 1245
  }
}
```

---

### 4.2 Simuler l'impact d'un emplacement

**Endpoint:** `POST /recommendations/simulate`

**Description:** Simule l'impact d'un nouvel emplacement avant validation.

**Corps de la requête:**

```json
{
  "location": {
    "type": "Point",
    "coordinates": [2.4021, 48.8473]
  },
  "transport_type": "carsharing",
  "walking_radius_m": 400
}
```

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "location": {
      "type": "Point",
      "coordinates": [2.4021, 48.8473]
    },
    "transport_type": "carsharing",
    "impact": {
      "new_population_served": 4850,
      "coverage_improvement": 0.045,
      "existing_coverage": 0.32,
      "projected_coverage": 0.365,
      "overlap_with_existing": 0.12
    },
    "coverage_area": {
      "type": "Polygon",
      "coordinates": [[[2.3980, 48.8433], [2.4062, 48.8433], [2.4062, 48.8513], [2.3980, 48.8513], [2.3980, 48.8433]]]
    },
    "demographics": {
      "total_population": 5420,
      "already_served": 570,
      "newly_served": 4850,
      "avg_income": 32000,
      "car_ownership_rate": 0.42
    },
    "score": 0.92,
    "warnings": []
  }
}
```

---

### 4.3 Obtenir le détail d'une recommandation

**Endpoint:** `GET /recommendations/{recommendation_id}`

**Description:** Détails complets d'une recommandation spécifique.

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "rec_001",
    "rank": 1,
    "location": {
      "type": "Point",
      "coordinates": [2.4021, 48.8473]
    },
    "address": "Avenue de la République, Montreuil",
    "transport_type": "carsharing",
    "estimated_cost": 50000,
    "impact": {
      "new_population_served": 4850,
      "coverage_improvement": 0.045,
      "existing_coverage": 0.32,
      "projected_coverage": 0.365
    },
    "detailed_analysis": {
      "population_breakdown": {
        "0-18": 1240,
        "18-35": 1850,
        "35-65": 1520,
        "65+": 240
      },
      "employment": {
        "employed": 3240,
        "unemployed": 420,
        "students": 1190
      },
      "transport_habits": {
        "public_transport": 0.62,
        "car": 0.28,
        "bike": 0.10
      }
    },
    "justification": "Zone densément peuplée avec faible couverture actuelle.",
    "score": 0.92,
    "created_at": "2026-10-19T15:30:00Z"
  }
}
```

---

## 5. Régions & Métadonnées

### 5.1 Lister les régions

**Endpoint:** `GET /regions`

**Description:** Liste des régions/villes disponibles dans les données.

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "regions": [
      {
        "id": "ile-de-france",
        "name": "Île-de-France",
        "type": "region",
        "population": 12_278_210,
        "area_km2": 12_012,
        "stations_count": 12_450,
        "coverage_rate": 0.93,
        "bounds": {
          "min_lng": 1.4461,
          "min_lat": 48.1203,
          "max_lng": 3.5581,
          "max_lat": 49.2411
        }
      },
      {
        "id": "paris",
        "name": "Paris",
        "type": "city",
        "population": 2_165_423,
        "area_km2": 105,
        "stations_count": 3_842,
        "coverage_rate": 0.98,
        "parent_region": "ile-de-france",
        "bounds": {
          "min_lng": 2.2241,
          "min_lat": 48.8155,
          "max_lng": 2.4699,
          "max_lat": 48.9021
        }
      }
    ]
  }
}
```

---

### 5.2 Obtenir les métadonnées de l'API

**Endpoint:** `GET /metadata`

**Description:** Informations sur les données et la version de l'API.

**Réponse (200 OK):**

```json
{
  "success": true,
  "data": {
    "api_version": "1.0.0",
    "last_data_update": "2026-10-15T00:00:00Z",
    "data_sources": [
      {
        "name": "transport.data.gouv.fr",
        "type": "GTFS",
        "url": "https://transport.data.gouv.fr/datasets",
        "last_sync": "2026-10-15T00:00:00Z"
      },
      {
        "name": "INSEE Filosofi",
        "type": "Population",
        "url": "https://www.insee.fr/fr/statistiques/8735162",
        "year": 2024
      },
      {
        "name": "OpenStreetMap",
        "type": "Network",
        "url": "https://download.geofabrik.de/europe/france.html",
        "last_sync": "2026-10-10T00:00:00Z"
      }
    ],
    "coverage": {
      "regions": 18,
      "cities": 280,
      "stations": 45_230,
      "population_covered": 45_000_000
    },
    "model_info": {
      "version": "1.2.0",
      "algorithm": "Random Forest + Genetic Algorithm",
      "trained_on": "2026-09-01",
      "accuracy": 0.87
    }
  }
}
```

---

## 6. Codes d'erreur

### Format de réponse d'erreur

Toutes les erreurs suivent ce format :

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Le paramètre 'region' est invalide",
    "details": {
      "field": "region",
      "value": "invalid-region",
      "allowed_values": ["ile-de-france", "provence-alpes-cote-azur", ...]
    }
  }
}
```

### Codes d'erreur HTTP

| Code | Type | Description |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Paramètres de requête invalides |
| 401 | `UNAUTHORIZED` | Authentification requise (si applicable) |
| 404 | `NOT_FOUND` | Ressource non trouvée |
| 422 | `UNPROCESSABLE_ENTITY` | Données de requête invalides |
| 429 | `RATE_LIMIT_EXCEEDED` | Trop de requêtes |
| 500 | `INTERNAL_SERVER_ERROR` | Erreur serveur |
| 503 | `SERVICE_UNAVAILABLE` | Service temporairement indisponible |

### Codes d'erreur métier

| Code | Description |
|------|-------------|
| `REGION_NOT_FOUND` | Région spécifiée introuvable |
| `STATION_NOT_FOUND` | Station introuvable |
| `INSUFFICIENT_DATA` | Données insuffisantes pour cette région |
| `BUDGET_TOO_LOW` | Budget insuffisant pour générer des recommandations |
| `INVALID_COORDINATES` | Coordonnées GPS invalides |
| `COMPUTATION_TIMEOUT` | Calcul trop long, réessayez avec moins de paramètres |

---

## 📝 Notes d'implémentation

### CORS
L'API doit accepter les requêtes depuis le frontend (localhost:3000 en dev).

### Rate Limiting
- 100 requêtes par minute pour les endpoints GET
- 20 requêtes par minute pour les endpoints POST

### Cache
- `/mobility/types` : cache 1 heure
- `/regions` : cache 1 heure
- `/statistics/*` : cache 15 minutes
- `/mobility/coverage` : cache 5 minutes
- `/stations` : cache 5 minutes

### Performance
- Les requêtes avec `bounds` sont plus rapides que sans
- Limiter les résultats avec `limit` pour de meilleures performances
- Le calcul de recommandations peut prendre 1-3 secondes

---

## 🚀 Exemple d'utilisation (Frontend)

```typescript
// Configuration axios
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Récupérer les zones de couverture
const coverage = await api.get('/mobility/coverage', {
  params: {
    region: 'ile-de-france',
    resolution: '200m'
  }
});

// Obtenir des recommandations
const recommendations = await api.post('/recommendations', {
  region: 'ile-de-france',
  budget: 500000,
  transport_types: ['carsharing', 'bike']
});
```

---

**Date de création:** 19 octobre 2026  
**Auteur:** Équipe Hackathon Mobilité  
**Contact:** Pour toute question, contactez l'équipe backend
