# 📨 Message pour l'Équipe Backend

**De:** Komlan malik-junior Edah (Frontend)  
**Date:** 20 octobre 2026

---

## 🎯 TL;DR (Résumé)

✅ **GeoJSON** : Leaflet est 100% compatible, pas de souci  
✅ **Validation API v1.1** : Document créé → `API_CONTRACT_VALIDATION.md`  
✅ **Frontend prêt** : Interface complète avec sidebar noir

---

## 1️⃣ Réponse : Compatibilité GeoJSON

### Question : "Bibliothèque compatible avec GeoJSON ?"

**Réponse : Leaflet est DÉJÀ compatible GeoJSON nativement** ✅

- ✅ Support intégré du format GeoJSON
- ✅ Pas de package supplémentaire nécessaire
- ✅ Composant `<GeoJSON>` disponible dans react-leaflet
- ✅ Nouveau composant créé : `components/map/GeoJSONLayer.tsx`

**Voir détails dans :** `GEOJSON_COMPATIBILITY.md`

---

## 2️⃣ Validation du Contrat API v1.1

### Document Créé

📄 **`API_CONTRACT_VALIDATION.md`** - Document complet de validation

### Ce que contient le document :

✅ **Format exact attendu** pour chaque endpoint (6 routes MVP)  
✅ **Points critiques** à respecter (coordonnées, scores, types)  
✅ **Exemples JSON** pour chaque réponse  
✅ **Checklist de validation** avant PR  
✅ **Tests d'intégration** recommandés  
✅ **Codes de test curl** pour valider

---

## 🚨 3 POINTS CRITIQUES à Vérifier

### ⚠️ 1. Format des Coordonnées

**TOUJOURS : `[longitude, latitude]`** (standard GeoJSON)

```json
// ✅ CORRECT
"coordinates": [2.3522, 48.8566]  // [lng, lat]

// ❌ INCORRECT
"coordinates": [48.8566, 2.3522]  // [lat, lng]
```

### ⚠️ 2. Scores entre 0 et 1

**PAS de pourcentages**, uniquement des floats entre 0 et 1 :

```json
// ✅ CORRECT
"coverage_score": 0.85   // représente 85%
"coverage_rate": 0.93    // représente 93%

// ❌ INCORRECT
"coverage_score": 85
"coverage_rate": 93
```

### ⚠️ 3. Types de Transport Exacts

**Uniquement ces 6 valeurs (lowercase) :**

```typescript
'bus' | 'metro' | 'tram' | 'bike' | 'carsharing' | 'scooter'
```

❌ Pas de variations : `'Bus'`, `'BUS'`, `'vélo'`, `'train'`

---

## 📋 Avant d'Ouvrir la PR vers Dev

### Checklist Rapide

- [ ] Coordonnées : `[longitude, latitude]` partout
- [ ] Scores/rates : entre 0 et 1 (float)
- [ ] Types transport : les 6 valeurs exactes
- [ ] Format GeoJSON respecté
- [ ] CORS configuré pour `http://localhost:3000`
- [ ] Les 6 endpoints MVP implémentés

### Test Rapide CORS

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:8000/api/v1/stations

# Doit retourner des headers Access-Control-Allow-*
```

---

## 📦 Documents à Consulter

1. **`API_CONTRACT_VALIDATION.md`** → Validation complète API v1.1
2. **`GEOJSON_COMPATIBILITY.md`** → Compatibilité GeoJSON
3. **`API_SPECIFICATION.md`** → Spécification complète des endpoints
4. **`types/api.ts`** → Types TypeScript (tous les formats)

---

## 🧪 Validation GeoJSON

### Outil en ligne

Testez votre JSON sur : **https://geojson.io/**

✅ Si la carte s'affiche → GeoJSON valide  
❌ Si erreur → Format incorrect

### Test curl

```bash
# Tester un endpoint
curl http://localhost:8000/api/v1/stations?limit=1 | \
  jq '.data.stations[0].location'

# Doit afficher :
{
  "type": "Point",
  "coordinates": [2.3522, 48.8566]  # [lng, lat]
}
```

---

## 🎨 État du Frontend

✅ **Interface complète créée** avec sidebar noir  
✅ **3 pages** : Dashboard, Carte, Recommandations  
✅ **24 composants** professionnels  
✅ **Service API** prêt pour les 6 endpoints  
✅ **Support GeoJSON** natif avec Leaflet

**Le frontend est prêt à recevoir vos données dès que l'API est opérationnelle !** 🚀

---

## 📞 Questions ?

Consultez les documents listés ci-dessus ou contactez-moi.

**Bon courage pour la PR !** 💪

---

**Komlan malik-junior Edah**  
Frontend Lead - Hackathon Mobilité
