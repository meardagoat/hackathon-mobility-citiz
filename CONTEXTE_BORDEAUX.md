# 🎯 Contexte : Bordeaux Métropole

## 📍 Pourquoi Bordeaux ?

Le hackathon se concentre sur **Bordeaux Métropole** comme cas d'étude principal.

### Données du Backend (d'après l'équipe data)

**Zone géographique :**
- 6 644 carreaux de 200m analysés
- Bordeaux Métropole uniquement

**Réseau de transport :**
- TBM (Transports Bordeaux Métropole)
- Lignes scolaires exclues
- Free-floating (Dott, Pony) exclu

**Stations analysées :**
- 5 810 arrêts/stations TBM

**Couverture actuelle à 5 min (400m) :**
- Bus/Tram : **96,5%** des habitants
- Vélo partagé : **40,2%** des habitants  
- Citiz (autopartage) : **26,6%** des habitants

---

## 🎯 Objectif du Projet

**Améliorer la couverture Citiz à Bordeaux Métropole**

### Scénario avec 1M€ d'investissement :
- 29 nouvelles stations Citiz
- ~107 000 habitants nouvellement servis
- Couverture portée à **40,4%** (+13,8 points)
- ~232 voitures en moins estimées

---

## 🗺️ Ajustements Frontend

### 1. Centre de la Carte
**Avant :** Paris (Île-de-France)  
**Maintenant :** Bordeaux Métropole

```typescript
// Coordonnées GPS de Bordeaux
MAP_DEFAULT_CENTER: [44.8378, -0.5792]
MAP_DEFAULT_ZOOM: 12
```

### 2. Région par Défaut
**Bordeaux Métropole** est maintenant la première option dans les filtres.

### 3. Types de Transport Pertinents

Pour Bordeaux Métropole (TBM) :
- ✅ **Bus** (principal)
- ✅ **Tram** (réseau TBM)
- ✅ **Vélo** (vélo partagé)
- ✅ **Carsharing** (Citiz - focus du projet)
- ❌ Métro (pas de métro à Bordeaux)
- ⚠️ Scooter (free-floating exclu selon l'équipe data)

---

## 📊 Données Attendues du Backend

### Format des Carreaux (zones)

```json
{
  "zones": [
    {
      "id": "carreau_001",
      "code_commune": "33063", // Code commune Bordeaux
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
          "tram": 2,
          "bike": 3,
          "carsharing": 2
        }
      }
    }
  ]
}
```

### Format des Stations (offre_existante)

```json
{
  "stations": [
    {
      "id": "station_001",
      "name": "Place des Quinconces",
      "type": "tram",
      "operator": "TBM",
      "code_commune": "33063",
      "location": {
        "type": "Point",
        "coordinates": [-0.5707, 44.8457]
      },
      "population_served": 15420,
      "lines": ["Tram A", "Tram B"]
    }
  ]
}
```

### Format des Recommandations (candidats_scores)

```json
{
  "recommendations": [
    {
      "id": "rec_001",
      "rank": 1,
      "code_commune": "33063",
      "location": {
        "type": "Point",
        "coordinates": [-0.5792, 44.8378]
      },
      "address": "Rue Sainte-Catherine, Bordeaux",
      "transport_type": "carsharing",
      "estimated_cost": 80000,
      "impact": {
        "new_population_served": 4850,
        "coverage_improvement": 0.045
      },
      "score": 0.92
    }
  ]
}
```

**Note :** Le champ `code_commune` doit être présent partout (requis par l'équipe data).

---

## 🔌 Appels API Adaptés

### Exemples avec Bordeaux

**Récupérer les zones :**
```bash
GET /api/v1/mobility/coverage?region=bordeaux-metropole
```

**Récupérer les stations :**
```bash
GET /api/v1/stations?region=bordeaux-metropole&type=bus
```

**Calculer des recommandations :**
```bash
POST /api/v1/recommendations
{
  "region": "bordeaux-metropole",
  "budget": 1000000,
  "transport_types": ["carsharing"],
  "constraints": {
    "min_population": 1000,
    "prioritize": "underserved_areas"
  },
  "cost_estimates": {
    "carsharing": 80000
  }
}
```

---

## 📍 Communes de Bordeaux Métropole

Les principales communes (28 au total) :

| Code INSEE | Commune |
|------------|---------|
| 33063 | Bordeaux |
| 33281 | Mérignac |
| 33449 | Pessac |
| 33522 | Talence |
| 33039 | Bègles |
| 33119 | Cenon |
| 33167 | Floirac |
| 33249 | Lormont |
| ... | ... |

**Le backend devrait fournir `code_commune` dans toutes les réponses.**

---

## 🎨 Interface Frontend Adaptée

### Page Dashboard
- KPIs affichés pour Bordeaux Métropole
- Graphiques basés sur les 6 644 carreaux
- Statistiques TBM + Citiz

### Page Carte
- Centrée sur Bordeaux (44.8378, -0.5792)
- Zoom niveau 12 pour voir toute la métropole
- Heat map des 6 644 carreaux de 200m
- Marqueurs des 5 810 stations TBM + Citiz

### Page Recommandations
- Région par défaut : "Bordeaux Métropole"
- Focus sur Citiz (autopartage)
- Coûts ajustés selon les estimations Bordeaux

---

## 📝 Checklist d'Intégration

Avant de connecter le backend :

### Vérifier que le Backend Renvoie :
- [ ] `region: "bordeaux-metropole"` ou `region: "Bordeaux Métropole"`
- [ ] `code_commune` dans chaque zone/station/recommandation
- [ ] 6 644 carreaux pour Bordeaux Métropole
- [ ] ~5 810 stations TBM
- [ ] Coordonnées GPS Bordeaux (44.x, -0.x)
- [ ] Types : `bus`, `tram`, `bike`, `carsharing` (pas de `metro`)

### Vérifier Côté Frontend :
- [x] Carte centrée sur Bordeaux (44.8378, -0.5792)
- [x] "Bordeaux Métropole" en première option dans les filtres
- [x] Zoom adapté (niveau 12)
- [ ] Tester avec vraies données du backend

---

## 🚀 Impact Attendu

Avec le frontend + backend intégrés sur Bordeaux :

1. **Visualisation** : Carte des 6 644 carreaux avec couverture actuelle
2. **Analyse** : Dashboard montrant 96,5% bus/tram vs 26,6% Citiz
3. **Recommandation** : Calcul des 29 meilleurs emplacements Citiz pour 1M€
4. **Impact** : +107 000 habitants desservis, couverture portée à 40,4%

---

## 📞 Questions Backend

À confirmer avec l'équipe backend/data :

1. ✅ La région s'appelle `"bordeaux-metropole"` ou `"Bordeaux Métropole"` dans l'API ?
2. ✅ Le champ `code_commune` est-il présent dans toutes les réponses ?
3. ✅ Les coordonnées sont bien `[longitude, latitude]` (pas inversées) ?
4. ✅ Les types utilisés sont `bus`, `tram`, `bike`, `carsharing` (lowercase) ?
5. ⚠️ Le free-floating (Dott, Pony, scooters) est-il totalement exclu ?

---

**Le frontend est maintenant adapté pour Bordeaux Métropole !** 🎯

**Prochaine étape :** Tester avec les vraies données du backend LakeHouseZ.
