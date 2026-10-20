# 📋 Requirements Backend - Vue Frontend

Ce document résume ce dont le frontend a besoin de la part du backend pour fonctionner correctement.

## ❌ Routes Initiales Proposées (Insuffisantes)

Votre proposition initiale :

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/v1/mobility/coverage` | Zones géographiques et indicateurs |
| GET | `/api/v1/stations` | Stations et arrêts existants |
| POST | `/api/v1/recommendations` | Emplacements recommandés |

**Problème** : Ces 3 routes ne couvrent pas tous les besoins du frontend.

---

## ✅ Routes Nécessaires (Version Complète)

### 🗺️ **Mobilité & Couverture** (4 routes)

| Priorité | Méthode | Route | Besoin Frontend |
|----------|---------|-------|-----------------|
| 🔴 CRITIQUE | GET | `/api/v1/mobility/coverage` | Zones pour la carte principale |
| 🔴 CRITIQUE | GET | `/api/v1/mobility/heatmap` | Données pour la heat map (performance) |
| 🟡 Important | GET | `/api/v1/mobility/types` | Liste types pour filtres |
| 🟢 Optionnel | GET | `/api/v1/mobility/coverage/geojson` | Export GeoJSON direct |

### 🚏 **Stations** (2 routes)

| Priorité | Méthode | Route | Besoin Frontend |
|----------|---------|-------|-----------------|
| 🔴 CRITIQUE | GET | `/api/v1/stations` | Liste avec filtres (type, région, bounds) |
| 🟡 Important | GET | `/api/v1/stations/{id}` | Détails pour popup carte |

### 📊 **Statistiques** (2 routes)

| Priorité | Méthode | Route | Besoin Frontend |
|----------|---------|-------|-----------------|
| 🔴 CRITIQUE | GET | `/api/v1/statistics/summary` | KPIs dashboard |
| 🔴 CRITIQUE | GET | `/api/v1/statistics/population` | Graphique répartition population |

### 💡 **Recommandations** (3 routes)

| Priorité | Méthode | Route | Besoin Frontend |
|----------|---------|-------|-----------------|
| 🔴 CRITIQUE | POST | `/api/v1/recommendations` | Calcul recommandations |
| 🟡 Important | POST | `/api/v1/recommendations/simulate` | Simulation avant validation |
| 🟢 Optionnel | GET | `/api/v1/recommendations/{id}` | Détails recommandation |

### 🌍 **Régions** (1 route)

| Priorité | Méthode | Route | Besoin Frontend |
|----------|---------|-------|-----------------|
| 🟡 Important | GET | `/api/v1/regions` | Sélecteur de régions |

### 📖 **Métadonnées** (1 route)

| Priorité | Méthode | Route | Besoin Frontend |
|----------|---------|-------|-----------------|
| 🟢 Optionnel | GET | `/api/v1/metadata` | Info API & sources données |

---

## 🎯 Priorités par Phase

### **Phase 1 - MVP (Minimum Viable Product)** ⚡

Routes **CRITIQUES** à implémenter en premier :

```
✅ GET  /api/v1/mobility/coverage     → Carte zones
✅ GET  /api/v1/mobility/heatmap      → Heat map
✅ GET  /api/v1/stations              → Marqueurs carte
✅ GET  /api/v1/statistics/summary    → Dashboard stats
✅ GET  /api/v1/statistics/population → Graphique population
✅ POST /api/v1/recommendations       → Recommandations
```

**Avec ces 6 routes, on a un MVP fonctionnel.**

### **Phase 2 - Amélioration** 🚀

Routes **IMPORTANTES** pour améliorer l'UX :

```
✅ GET  /api/v1/mobility/types          → Filtres types
✅ GET  /api/v1/stations/{id}           → Détails station
✅ POST /api/v1/recommendations/simulate → Simulation
✅ GET  /api/v1/regions                 → Sélecteur régions
```

### **Phase 3 - Nice to Have** ✨

Routes **OPTIONNELLES** pour fonctionnalités avancées :

```
✅ GET /api/v1/recommendations/{id}
✅ GET /api/v1/metadata
✅ GET /api/v1/mobility/coverage/geojson
```

---

## 🔌 Formats de Données Critiques

### 1. **Coverage Response** (CRITIQUE)

Le frontend attend ce format pour la carte :

```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": "zone_001",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[lng, lat], ...]]
        },
        "properties": {
          "population": 450,
          "coverage_score": 0.85,
          "transport_options": 12,
          "transport_types": {
            "bus": 5,
            "metro": 2
          }
        }
      }
    ]
  }
}
```

**Points critiques** :
- `geometry` doit être au format GeoJSON
- `coverage_score` entre 0 et 1 (pour la colorisation)
- `transport_types` pour les filtres

### 2. **HeatMap Response** (CRITIQUE)

Format optimisé pour la heat map :

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
          "coordinates": [lng, lat]
        },
        "properties": {
          "intensity": 0.85,
          "population": 450
        }
      }
    ]
  }
}
```

**Points critiques** :
- Format GeoJSON FeatureCollection
- `intensity` entre 0 et 1 pour la couleur heat map

### 3. **Stations Response** (CRITIQUE)

```json
{
  "success": true,
  "data": {
    "stations": [
      {
        "id": "station_001",
        "name": "Gare Saint-Lazare",
        "type": "train",
        "location": {
          "type": "Point",
          "coordinates": [lng, lat]
        },
        "population_served": 15420
      }
    ],
    "pagination": {
      "total": 12450,
      "has_more": true
    }
  }
}
```

**Points critiques** :
- `location` au format GeoJSON Point
- `type` doit correspondre aux types définis (bus, metro, tram, bike, carsharing, scooter)

### 4. **Recommendations Response** (CRITIQUE)

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
          "coordinates": [lng, lat]
        },
        "transport_type": "carsharing",
        "estimated_cost": 50000,
        "impact": {
          "new_population_served": 4850,
          "coverage_improvement": 0.045
        },
        "score": 0.92
      }
    ],
    "summary": {
      "total_cost": 500000,
      "budget_used": 490000,
      "budget_remaining": 10000
    }
  }
}
```

---

## 🚨 Points d'Attention Backend

### 1. **CORS** ⚠️

Le backend DOIT autoriser les requêtes depuis :
- `http://localhost:3000` (dev)
- `http://localhost:3001` (si multi-frontend)
- Le domaine de production

**FastAPI - Configuration CORS** :

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. **Format des Coordonnées** 📍

**TOUJOURS utiliser** : `[longitude, latitude]` (format GeoJSON)

❌ **PAS** : `[latitude, longitude]`

### 3. **Codes d'Erreur** ⚠️

Format standard attendu par le frontend :

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Le paramètre 'region' est invalide",
    "details": {
      "field": "region",
      "value": "invalid-region"
    }
  }
}
```

### 4. **Performance** ⚡

Endpoints qui DOIVENT être rapides :
- `/mobility/heatmap` → < 1 seconde
- `/stations` → < 500ms
- `/statistics/*` → < 500ms

Endpoint qui PEUT être lent :
- `/recommendations` → jusqu'à 3 secondes OK

### 5. **Pagination** 📄

Pour `/stations`, le frontend utilise :
- `limit` : nombre de résultats (défaut 100, max 1000)
- `offset` : décalage pour pagination

### 6. **Filtres** 🔍

Le frontend envoie ces paramètres :

**Bounds** (pour limiter à la zone visible) :
```
?bounds=min_lng,min_lat,max_lng,max_lat
Exemple : ?bounds=2.2241,48.8155,2.4699,48.9021
```

**Types de transport** (multi-sélection) :
```
?transport_types=bus,metro,bike
```

---

## 📋 Checklist Backend

### Avant de démarrer

- [ ] Installer FastAPI et dépendances
- [ ] Configurer CORS pour localhost:3000
- [ ] Tester avec Postman/Insomnia

### Phase 1 - MVP (2 jours)

- [ ] GET `/mobility/coverage` avec paramètre `region`
- [ ] GET `/mobility/heatmap` avec format GeoJSON
- [ ] GET `/stations` avec filtres `type`, `bounds`
- [ ] GET `/statistics/summary` avec stats globales
- [ ] GET `/statistics/population` avec répartition
- [ ] POST `/recommendations` avec calcul de base

### Phase 2 - Amélioration (1 jour)

- [ ] GET `/mobility/types` liste des types
- [ ] GET `/stations/{id}` détails station
- [ ] POST `/recommendations/simulate`
- [ ] GET `/regions` liste régions
- [ ] Optimisation performance queries

### Tests d'intégration

- [ ] Test CORS depuis frontend
- [ ] Test format GeoJSON
- [ ] Test pagination
- [ ] Test filtres multiples
- [ ] Test cas d'erreur

---

## 🔗 Communication Frontend ↔ Backend

### URL de test

```
Backend: http://localhost:8000
Frontend: http://localhost:3000
```

### Test rapide

```bash
# Tester si le backend répond
curl http://localhost:8000/api/v1/metadata

# Tester CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:8000/api/v1/stations
```

---

## 📞 Contact

Pour toute question sur les besoins frontend :
- Consultez `API_SPECIFICATION.md` (documentation complète)
- Regardez `types/api.ts` (tous les types TypeScript)
- Vérifiez `lib/api.ts` (exemples d'appels)

**N'hésitez pas à demander des clarifications ! 🚀**

---

**Résumé** : Le backend doit implémenter **6 routes critiques** en priorité pour avoir un MVP fonctionnel, puis **4 routes importantes** pour améliorer l'UX, et enfin **3 routes optionnelles** pour les fonctionnalités avancées.
