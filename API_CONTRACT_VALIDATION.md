# ✅ Validation du Contrat API v1.1 - Frontend

**Date:** 20 octobre 2026  
**Frontend:** Komlan malik-junior Edah  
**Backend:** [À compléter]

---

## 📋 Objectif

Valider le contrat API v1.1 avant l'ouverture de la PR backend vers dev, pour éviter les incompatibilités lors du merge.

---

## ✅ Compatibilité GeoJSON

### 🗺️ Bibliothèque Frontend Utilisée

**Leaflet / React-Leaflet** est **100% compatible GeoJSON** ✅

- ✅ Support natif du format GeoJSON via le composant `<GeoJSON>`
- ✅ Accepte `FeatureCollection` et `Feature`
- ✅ Coordonnées au format `[longitude, latitude]` (standard GeoJSON)
- ✅ Propriétés personnalisées dans `properties`

### 📦 Packages installés

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "@types/leaflet": "^1.9.12"
}
```

**Aucun package supplémentaire nécessaire** - Leaflet gère GeoJSON nativement.

---

## 🔌 Format des Endpoints Attendus par le Frontend

### 1. GET `/api/v1/mobility/coverage`

**Ce que le frontend attend :**

```typescript
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": "zone_001",
        "type": "grid_200m",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[lng, lat], [lng, lat], ...]]  // ⚠️ GeoJSON standard
        },
        "properties": {
          "population": 450,
          "coverage_score": 0.85,  // ⚠️ Float entre 0 et 1
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

**Points critiques :**
- ✅ `geometry` DOIT être au format GeoJSON standard
- ✅ Coordonnées : `[longitude, latitude]` (PAS `[latitude, longitude]`)
- ✅ `coverage_score` : float entre 0 et 1 (pour les couleurs)
- ✅ `transport_types` : objet avec clés `bus`, `metro`, `tram`, `bike`, `carsharing`, `scooter`

---

### 2. GET `/api/v1/mobility/heatmap`

**Ce que le frontend attend :**

```typescript
{
  "success": true,
  "data": {
    "type": "FeatureCollection",  // ⚠️ DOIT être "FeatureCollection"
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [lng, lat]  // ⚠️ [longitude, latitude]
        },
        "properties": {
          "intensity": 0.85,  // ⚠️ Float entre 0 et 1
          "population": 450,
          "transport_options": 12
        }
      }
    ],
    "legend": {
      "min": 0,
      "max": 1,
      "colors": ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#3b82f6"],
      "labels": ["Très faible", "Faible", "Moyen", "Bon", "Excellent"]
    }
  }
}
```

**Points critiques :**
- ✅ Format GeoJSON `FeatureCollection` standard
- ✅ `intensity` entre 0 et 1 (utilisé pour les couleurs)
- ✅ `type: "Feature"` pour chaque élément
- ✅ `legend` optionnel mais recommandé

---

### 3. GET `/api/v1/stations`

**Ce que le frontend attend :**

```typescript
{
  "success": true,
  "data": {
    "stations": [
      {
        "id": "station_001",
        "name": "Gare Saint-Lazare",
        "type": "train",  // ⚠️ Doit être l'un des types définis
        "operator": "SNCF",
        "location": {
          "type": "Point",
          "coordinates": [lng, lat]  // ⚠️ GeoJSON Point
        },
        "population_served": 15420,
        "walking_radius_m": 400,
        "lines": ["RER E", "Metro 3"],
        "status": "active",  // ⚠️ "active" | "inactive" | "maintenance"
        "capacity": null,
        "vehicles_available": null
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

**Types de transport valides :**
```typescript
type TransportType = 'bus' | 'metro' | 'tram' | 'bike' | 'carsharing' | 'scooter';
```

**Points critiques :**
- ✅ `location` : GeoJSON Point avec `[longitude, latitude]`
- ✅ `type` : DOIT être l'un des 6 types définis
- ✅ `status` : DOIT être "active", "inactive" ou "maintenance"
- ✅ Pagination avec `total`, `limit`, `offset`, `has_more`

---

### 4. GET `/api/v1/statistics/summary`

**Ce que le frontend attend :**

```typescript
{
  "success": true,
  "data": {
    "region": "Île-de-France",
    "population": {
      "total": 12278210,
      "covered": 11450380,
      "coverage_rate": 0.93  // ⚠️ Float entre 0 et 1
    },
    "stations": {
      "total": 12450,
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
      "well_served": 0.65,  // ⚠️ Float entre 0 et 1
      "moderately_served": 0.28,
      "poorly_served": 0.07
    },
    "avg_options_per_inhabitant": 0.042,
    "avg_walking_time_minutes": 4.2
  }
}
```

**Points critiques :**
- ✅ Tous les taux doivent être entre 0 et 1 (pas en pourcentage)
- ✅ `by_type` : clés doivent correspondre aux types de transport
- ✅ `well_served + moderately_served + poorly_served = 1.0`

---

### 5. GET `/api/v1/statistics/population`

**Ce que le frontend attend :**

```typescript
{
  "success": true,
  "data": {
    "distribution": [
      {
        "coverage_range": "0-0.2",  // ⚠️ Format exact
        "label": "Très faible",
        "population": 856000,
        "percentage": 7,  // ⚠️ Pourcentage (0-100)
        "color": "#ef4444"  // ⚠️ Code couleur hexadécimal
      },
      {
        "coverage_range": "0.2-0.4",
        "label": "Faible",
        "population": 1227821,
        "percentage": 10,
        "color": "#f59e0b"
      },
      // ... 3 autres tranches
    ]
  }
}
```

**Points critiques :**
- ✅ Exactement 5 tranches : `0-0.2`, `0.2-0.4`, `0.4-0.6`, `0.6-0.8`, `0.8-1.0`
- ✅ `percentage` : entier entre 0 et 100 (somme = 100)
- ✅ `color` : code hexadécimal avec `#`

---

### 6. POST `/api/v1/recommendations`

**Ce que le frontend envoie :**

```typescript
{
  "region": "ile-de-france",
  "budget": 500000,
  "transport_types": ["carsharing", "bike"],  // ⚠️ Array de types valides
  "constraints": {
    "min_population": 1000,
    "max_distance_existing": 800,
    "prioritize": "underserved_areas"  // ⚠️ Enum
  },
  "cost_estimates": {
    "carsharing": 50000,
    "bike": 30000
  }
}
```

**Ce que le frontend attend en réponse :**

```typescript
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "rec_001",
        "rank": 1,
        "location": {
          "type": "Point",
          "coordinates": [lng, lat]  // ⚠️ GeoJSON Point
        },
        "address": "Avenue de la République, Montreuil",
        "transport_type": "carsharing",
        "estimated_cost": 50000,
        "impact": {
          "new_population_served": 4850,
          "coverage_improvement": 0.045,  // ⚠️ Float
          "existing_coverage": 0.32,
          "projected_coverage": 0.365
        },
        "justification": "Zone densément peuplée...",
        "score": 0.92,  // ⚠️ Float entre 0 et 1
        "nearby_facilities": {
          "metro_stations": 1,
          "bus_stops": 3,
          "residential_density": "high"  // ⚠️ "low" | "medium" | "high"
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

**Points critiques :**
- ✅ `location` : GeoJSON Point
- ✅ Tous les scores/rates : float entre 0 et 1
- ✅ `residential_density` : enum "low" | "medium" | "high"
- ✅ `recommendations` triées par `rank`

---

## 🚨 Points d'Attention CRITIQUES

### 1. Format des Coordonnées ⚠️

**TOUJOURS : `[longitude, latitude]`** (standard GeoJSON)

❌ **JAMAIS : `[latitude, longitude]`**

```typescript
// ✅ CORRECT
"coordinates": [2.3522, 48.8566]  // [lng, lat]

// ❌ INCORRECT
"coordinates": [48.8566, 2.3522]  // [lat, lng] - MAUVAIS
```

### 2. Types de Transport ⚠️

**Valeurs exactes acceptées :**

```typescript
'bus' | 'metro' | 'tram' | 'bike' | 'carsharing' | 'scooter'
```

❌ Pas de variations : `'Bus'`, `'BUS'`, `'vélo'`, `'train'`, etc.

### 3. Scores et Taux ⚠️

**TOUJOURS entre 0 et 1** (pas en pourcentage)

```typescript
// ✅ CORRECT
"coverage_score": 0.85   // 85%
"coverage_rate": 0.93    // 93%

// ❌ INCORRECT
"coverage_score": 85     // MAUVAIS
"coverage_rate": 93      // MAUVAIS
```

### 4. Structure GeoJSON ⚠️

**Format standard obligatoire :**

```typescript
// Pour les Points
{
  "type": "Point",
  "coordinates": [lng, lat]
}

// Pour les Polygons
{
  "type": "Polygon",
  "coordinates": [[[lng, lat], [lng, lat], ...]]
}

// Pour les FeatureCollections
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { ... },
      "properties": { ... }
    }
  ]
}
```

### 5. CORS ⚠️

Le backend DOIT autoriser :

```python
# FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📝 Checklist de Validation Backend

Avant d'ouvrir la PR vers dev :

### Format des Données
- [ ] Tous les `coordinates` sont au format `[longitude, latitude]`
- [ ] Tous les scores/rates sont entre 0 et 1 (float)
- [ ] Tous les `type` de transport utilisent exactement les 6 valeurs définies
- [ ] Format GeoJSON respecté (type, coordinates, properties)

### Réponses API
- [ ] Toutes les réponses suivent le format `{ success: true, data: {...} }`
- [ ] Erreurs suivent le format `{ success: false, error: {...} }`
- [ ] Pagination avec `total`, `limit`, `offset`, `has_more`
- [ ] Métadonnées incluses quand spécifié

### Endpoints
- [ ] Les 6 endpoints MVP sont implémentés
- [ ] Tous acceptent les paramètres définis
- [ ] Tous retournent le format exact attendu
- [ ] CORS configuré pour localhost:3000

### Performance
- [ ] `/mobility/heatmap` : < 1 seconde
- [ ] `/stations` : < 500ms
- [ ] `/statistics/*` : < 500ms
- [ ] `/recommendations` : < 3 secondes acceptable

---

## 🧪 Tests d'Intégration Recommandés

### Test 1 : Format GeoJSON

```bash
# Tester que les coordonnées sont bien [lng, lat]
curl http://localhost:8000/api/v1/stations?limit=1 | jq '.data.stations[0].location.coordinates'

# Attendu : [2.3522, 48.8566] (Paris)
# Si vous voyez [48.8566, 2.3522], c'est INVERSÉ ❌
```

### Test 2 : Types de Transport

```bash
# Vérifier que les types sont corrects
curl http://localhost:8000/api/v1/statistics/summary | jq '.data.stations.by_type | keys'

# Attendu : ["bike", "bus", "carsharing", "metro", "scooter", "tram"]
```

### Test 3 : Scores entre 0 et 1

```bash
# Vérifier que coverage_score est bien entre 0 et 1
curl http://localhost:8000/api/v1/mobility/coverage?limit=1 | jq '.data.zones[0].properties.coverage_score'

# Attendu : 0.85 (pas 85)
```

### Test 4 : CORS

```bash
# Tester que CORS fonctionne
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:8000/api/v1/stations

# Doit retourner des headers Access-Control-Allow-*
```

---

## ✅ Validation Frontend

Une fois le backend en place, le frontend testera :

1. ✅ Affichage de la carte avec les données GeoJSON
2. ✅ Heat map avec les bonnes couleurs
3. ✅ Marqueurs des stations aux bons emplacements
4. ✅ Dashboard avec les statistiques
5. ✅ Formulaire de recommandations fonctionnel

---

## 📞 Contact Frontend

**Komlan malik-junior Edah**

Pour toute question sur le format attendu :
- Voir ce document
- Consulter `API_SPECIFICATION.md`
- Vérifier `types/api.ts` (types TypeScript complets)

---

## 🎯 Résumé

**3 points CRITIQUES à vérifier avant la PR :**

1. ✅ **Coordonnées GeoJSON** : `[longitude, latitude]` partout
2. ✅ **Scores entre 0 et 1** : pas de pourcentages (0.85 pas 85)
3. ✅ **Types de transport exacts** : 'bus' | 'metro' | 'tram' | 'bike' | 'carsharing' | 'scooter'

**Si ces 3 points sont respectés, l'intégration sera fluide !** 🚀

---

**Dernière mise à jour :** 20 octobre 2026  
**Statut :** ✅ Prêt pour validation backend
