# Guide d'Intégration Backend - Frontend

## 🎯 Objectif

Connecter le frontend Next.js à l'API backend FastAPI en mode mock pour la démo hackathon.

---

## 📋 Prérequis

### Backend
- API backend démarrée sur `http://localhost:8000`
- Commande : `cd backend && .venv/bin/uvicorn app.main:app --reload`
- Swagger disponible sur : http://localhost:8000/docs

### Frontend
- Next.js dev server sur `http://localhost:3000`
- Commande : `npm run dev`
- Configuration : `.env.local` avec `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`

---

## 🔄 Flux de Données

### 1. Carreaux (Coverage Zones)

**Backend** (`DATA_CONTRACT.md` - table `carreaux`)
```json
{
  "id_carreau": "33_200_...",
  "code_commune": "33063",
  "lat": 44.8378,
  "lon": -0.5792,
  "population": 150,
  "nb_options": 5,
  "options_par_habitant": 0.033,
  "nb_bus": 2,
  "nb_tram": 1,
  "nb_velo": 2,
  "nb_citiz": 0,
  "niveau_acces": 3,
  "donnee_masquee": false
}
```

**Frontend** (transformé en `Zone`)
```typescript
{
  id: "33_200_...",
  type: "grid_200m",
  geometry: {
    type: "Polygon",
    coordinates: [[[lon, lat], ...]]  // GeoJSON [lon, lat]
  },
  properties: {
    population: 150,
    coverage_score: 0.033,
    transport_options: 5,
    transport_types: {
      bus: 2,
      tram: 1,
      bike: 2,
      carsharing: 0
    }
  }
}
```

### 2. Stations (Existing Offer)

**Backend** (`offre_existante`)
```json
{
  "id_station": "TBM_BUS_001",
  "nom": "Gambetta",
  "type": "bus",
  "operateur": "TBM",
  "code_commune": "33063",
  "lat": 44.8378,
  "lon": -0.5792,
  "pop_desservie": 5000
}
```

**Frontend** (transformé en `Station`)
```typescript
{
  id: "TBM_BUS_001",
  name: "Gambetta",
  type: "bus",  // velo→bike, citiz→carsharing, train→metro, bateau→bus
  operator: "TBM",
  location: {
    type: "Point",
    coordinates: [-0.5792, 44.8378]  // [lon, lat] pour GeoJSON
  },
  population_served: 5000
}
```

### 3. Recommandations

**Backend** (`recommandations`)
```json
{
  "rang": 1,
  "id_candidat": "RECO_001",
  "type": "velo",
  "lat": 44.8500,
  "lon": -0.5700,
  "cout_eur": 15000,
  "pop_nouvelle": 3200,
  "score": 85.5,
  "adequation": 0.95,
  "voitures_evitees": 120
}
```

**Frontend** (transformé en `Recommendation`)
```typescript
{
  id: "RECO_001",
  rank: 1,
  location: {
    type: "Point",
    coordinates: [-0.5700, 44.8500]
  },
  transport_type: "bike",  // velo→bike
  estimated_cost: 15000,
  impact: {
    new_population_served: 3200,
    coverage_improvement: 0.008
  },
  score: 0.855  // Backend 0-100, Frontend 0-1
}
```

---

## 🛠️ Configuration

### Fichier `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_ENV=development
```

### Mapping des Types de Transport
```typescript
// lib/dataTransformers.ts
const BACKEND_TYPE_MAPPING = {
  bus: 'bus',
  tram: 'tram',
  metro: 'metro',
  train: 'metro',      // ⚠️ Train → Metro
  bateau: 'bus',       // ⚠️ Bateau → Bus
  velo: 'bike',        // ⚠️ Velo → Bike
  citiz: 'carsharing'  // ⚠️ Citiz → Carsharing
};
```

---

## 📡 Endpoints API

### Coverage (Zones)
```
GET /api/v1/mobility/coverage?region=bordeaux
→ Renvoie les carreaux
→ Transformés en zones avec polygones 200m×200m
```

### Heat Map
```
GET /api/v1/mobility/heatmap?region=bordeaux
→ Renvoie les carreaux avec intensité
→ Transformés en GeoJSON FeatureCollection
```

### Stations
```
GET /api/v1/stations?region=bordeaux&limit=100
→ Renvoie offre_existante
→ Transformé en stations avec [lon,lat]
```

### Statistics Summary
```
GET /api/v1/statistics/summary?region=bordeaux
→ Calcule depuis carreaux et stations
→ Retourne KPIs (population, couverture, accessibilité)
```

### Statistics Population
```
GET /api/v1/statistics/population?region=bordeaux
→ Distribution par niveau_acces (1-5)
→ Transformé en 5 catégories avec couleurs
```

### Recommendations
```
POST /api/v1/recommendations
Body: {
  "region": "bordeaux",
  "budget_max": 500000,
  "transport_types": ["bike", "carsharing"]
}
→ Retourne recommandations optimisées
```

---

## 🧪 Tests

### 1. Test Backend Seul
```bash
node test-backend.js
```
Vérifie que tous les endpoints répondent.

### 2. Test Frontend + Backend
```bash
# Terminal 1 : Backend
cd backend
.venv/bin/uvicorn app.main:app --reload

# Terminal 2 : Frontend
cd hackathon_mobility_frontend
npm run dev

# Terminal 3 : Tests
node test-backend.js
```

### 3. Vérifier dans le navigateur
- Dashboard : http://localhost:3000
- Map : http://localhost:3000/map
- Recommendations : http://localhost:3000/recommendations
- Backend Swagger : http://localhost:8000/docs

---

## ⚠️ Points d'Attention

### Données Masquées
Les carreaux avec `donnee_masquee: true` (< 11 ménages) :
- Affichent `population: 0`
- Affichent `options_par_habitant: 0`
- Pas de suppression visuelle (pour garder la couverture complète)

### Format GeoJSON
- Backend envoie : `{lat, lon}`
- Frontend attend : `[longitude, latitude]`
- **Transformé automatiquement** dans `dataTransformers.ts`

### CORS
Si erreur CORS, vérifier que le backend autorise `http://localhost:3000` :
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🐛 Debugging

### Backend ne répond pas
```bash
# Vérifier que le backend tourne
curl http://localhost:8000/api/v1/health

# Logs backend
cd backend
.venv/bin/uvicorn app.main:app --reload --log-level debug
```

### Frontend ne reçoit pas les données
```bash
# Vérifier .env.local
cat .env.local

# Logs frontend (console browser F12)
# Chercher: [API] GET /mobility/coverage
```

### Données vides ou incorrectes
1. Vérifier le Swagger : http://localhost:8000/docs
2. Tester manuellement un endpoint
3. Comparer avec `DATA_CONTRACT.md`
4. Vérifier les transformateurs dans `lib/dataTransformers.ts`

---

## 📚 Documentation Associée

- `DATA_CONTRACT.md` - Contrat backend (fait foi)
- `API_SPECIFICATION.md` - Spécification frontend
- `BACKEND_REQUIREMENTS.md` - Besoins frontend
- `lib/dataTransformers.ts` - Code de transformation
- `lib/api.ts` - Client API frontend

---

## ✅ Checklist Intégration

- [ ] Backend lancé sur http://localhost:8000
- [ ] Frontend lancé sur http://localhost:3000
- [ ] `.env.local` configuré
- [ ] Test backend réussi (`node test-backend.js`)
- [ ] Dashboard affiche les KPIs
- [ ] Map affiche les zones colorées
- [ ] Stations visibles sur la carte
- [ ] Recommendations retourne des résultats
- [ ] Pas d'erreurs CORS dans la console
- [ ] Données cohérentes avec Swagger

---

## 🚀 Prochaines Étapes

1. ✅ Backend en mode mock → **FAIT**
2. 🔄 Intégration frontend → **EN COURS**
3. ⏳ Tests avec données réelles Lakehouse → **En attente équipe data**
4. 🎯 Démo finale hackathon

---

**Contact Backend :** Komlan malik-junior Edah  
**Dernière mise à jour :** $(date)
