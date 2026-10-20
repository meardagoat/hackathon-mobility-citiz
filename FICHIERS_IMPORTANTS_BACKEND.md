# 📦 Fichiers Importants pour l'Équipe Backend

**Date:** 20 octobre 2026  
**Objectif:** Intégration Frontend ↔ Backend

---

## 🔴 PRIORITÉ ABSOLUE - À Lire AVANT de Coder

### 1. **API_CONTRACT_VALIDATION.md** ⭐⭐⭐⭐⭐
**Pourquoi:** Spécification EXACTE des 6 endpoints MVP + 3 points critiques

**Contient:**
- Format JSON attendu pour chaque endpoint
- Exemples complets
- 3 points critiques à respecter :
  1. Coordonnées : `[longitude, latitude]`
  2. Scores : entre 0 et 1 (pas de %)
  3. Types : 'bus' | 'metro' | 'tram' | 'bike' | 'carsharing' | 'scooter'
- Checklist avant PR
- Tests curl

**Commencez ici !** 👈

---

### 2. **MESSAGE_POUR_BACKEND.md** ⭐⭐⭐⭐
**Pourquoi:** Résumé rapide (TL;DR du contrat API)

**Contient:**
- 3 points critiques en 2 minutes
- Checklist rapide
- Tests CORS

**Pour un aperçu rapide** 👈

---

## 🟡 IMPORTANT - Documentation Complète

### 3. **API_SPECIFICATION.md** ⭐⭐⭐⭐
**Pourquoi:** Documentation complète des 6 endpoints MVP

**Contient:**
- Tous les paramètres de requête
- Tous les formats de réponse
- Codes d'erreur
- Exemples d'utilisation
- Notes de performance

---

### 4. **CONTEXTE_BORDEAUX.md** ⭐⭐⭐
**Pourquoi:** Explique le cas d'étude Bordeaux Métropole

**Contient:**
- Pourquoi Bordeaux ?
- Données attendues (6 644 carreaux, 5 810 stations)
- Couverture actuelle (Bus/Tram 96,5%, Citiz 26,6%)
- Format des données par table
- Champ `code_commune` requis

---

### 5. **GEOJSON_COMPATIBILITY.md** ⭐⭐⭐
**Pourquoi:** Confirmation compatibilité format GeoJSON

**Contient:**
- Leaflet supporte GeoJSON nativement
- Format exact attendu (Points, Polygons, FeatureCollections)
- Exemples de validation
- Pas de bibliothèque supplémentaire nécessaire

---

### 6. **BACKEND_REQUIREMENTS.md** ⭐⭐⭐
**Pourquoi:** Liste complète des besoins frontend

**Contient:**
- Les 3 routes initiales (insuffisantes)
- Les 6 routes MVP nécessaires
- Les 4 routes "nice to have"
- Priorités par phase
- Formats de données critiques

---

## 🟢 RÉFÉRENCE - Code et Types

### 7. **types/api.ts** ⭐⭐⭐⭐
**Pourquoi:** Types TypeScript COMPLETS = format de données exact

**Contient:**
- Tous les types d'interface (Station, Zone, Recommendation, etc.)
- Enums (TransportType, CoverageRange, etc.)
- Géométrie GeoJSON (Point, Polygon)
- Tous les formats de réponse API

**Super utile pour comprendre le format attendu !**

---

### 8. **lib/api.ts** ⭐⭐
**Pourquoi:** Service API frontend (référence)

**Contient:**
- Les 6 méthodes d'appel API
- Comment le frontend appelle le backend
- Gestion d'erreurs

---

### 9. **.env.example** ⭐
**Pourquoi:** Configuration URL backend

**Contient:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 📊 CONTEXTE - Documentation Équipe

### 10. **AVANCEMENT_FRONTEND.md**
Rapport complet de l'avancement frontend (pour info générale)

### 11. **MESSAGE_EQUIPE.txt**
Message pour le chat d'équipe (ce qui a été fait)

### 12. **README.md**
Guide général du projet frontend

---

## 🎯 Ordre de Lecture Recommandé

### Si vous avez 5 minutes :
1. **MESSAGE_POUR_BACKEND.md** (2 min)
2. **API_CONTRACT_VALIDATION.md** - Section "3 Points Critiques" (3 min)

### Si vous avez 15 minutes :
1. **MESSAGE_POUR_BACKEND.md** (2 min)
2. **API_CONTRACT_VALIDATION.md** complet (10 min)
3. **CONTEXTE_BORDEAUX.md** (3 min)

### Si vous avez 1 heure :
1. **MESSAGE_POUR_BACKEND.md** (2 min)
2. **API_CONTRACT_VALIDATION.md** (10 min)
3. **API_SPECIFICATION.md** (30 min)
4. **CONTEXTE_BORDEAUX.md** (5 min)
5. **GEOJSON_COMPATIBILITY.md** (5 min)
6. **types/api.ts** (parcourir - 10 min)

---

## ✅ Checklist Backend Avant PR

Avant d'ouvrir votre PR vers dev, vérifiez :

### Format des Données
- [ ] Coordonnées : `[longitude, latitude]` partout
- [ ] Scores/rates : entre 0 et 1 (float)
- [ ] Types transport : exactement les 6 valeurs lowercase
- [ ] Format GeoJSON respecté

### Endpoints
- [ ] Les 6 endpoints MVP implémentés
- [ ] Tous retournent `{ success: true, data: {...} }`
- [ ] Erreurs retournent `{ success: false, error: {...} }`
- [ ] Paramètres de requête gérés

### Configuration
- [ ] CORS autorise `http://localhost:3000`
- [ ] Base URL : `http://localhost:8000/api/v1`
- [ ] Timeout raisonnable (30s max)

### Données Bordeaux
- [ ] Région = "bordeaux-metropole" ou "Bordeaux Métropole"
- [ ] Champ `code_commune` présent partout
- [ ] 6 644 carreaux disponibles
- [ ] ~5 810 stations TBM

### Tests
- [ ] Test coordonnées avec curl (vérifier [lng, lat])
- [ ] Test CORS avec curl OPTIONS
- [ ] Test types de transport
- [ ] Test avec frontend en local

---

## 🧪 Tests Rapides

### Test 1 : CORS
```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:8000/api/v1/stations
```

### Test 2 : Format Coordonnées
```bash
curl http://localhost:8000/api/v1/stations?limit=1 | jq '.data.stations[0].location.coordinates'
# Attendu : [longitude, latitude] pour Bordeaux (ex: [-0.5792, 44.8378])
```

### Test 3 : Scores
```bash
curl http://localhost:8000/api/v1/statistics/summary | jq '.data.population.coverage_rate'
# Attendu : float entre 0 et 1 (ex: 0.93, pas 93)
```

---

## 📞 Contact Frontend

**Komlan malik-junior Edah**

Questions sur :
- Format attendu → `API_CONTRACT_VALIDATION.md`
- Endpoints spécifiques → `API_SPECIFICATION.md`
- Types de données → `types/api.ts`
- GeoJSON → `GEOJSON_COMPATIBILITY.md`
- Bordeaux → `CONTEXTE_BORDEAUX.md`

---

## 🎯 Résumé en 3 Points

1. **Lisez d'abord** `MESSAGE_POUR_BACKEND.md` et `API_CONTRACT_VALIDATION.md`
2. **Respectez les 3 points critiques** : coordonnées [lng, lat], scores 0-1, types exacts
3. **Testez avec curl** avant d'ouvrir la PR

**Le frontend est prêt à recevoir vos données !** 🚀

---

**Dernière mise à jour :** 20 octobre 2026
