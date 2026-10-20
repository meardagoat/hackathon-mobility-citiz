# 🗺️ Compatibilité GeoJSON - Leaflet

**Date:** 20 octobre 2026  
**Statut:** ✅ 100% Compatible

---

## ✅ Confirmation : Leaflet est Compatible GeoJSON

**Leaflet et React-Leaflet** sont **naturement compatibles** avec le format GeoJSON standard.

### 📦 Packages Utilisés

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "@types/leaflet": "^1.9.12"
}
```

**Aucun package supplémentaire requis** - le support GeoJSON est intégré.

---

## 🎯 Composant GeoJSON Créé

Un nouveau composant a été ajouté : **`components/map/GeoJSONLayer.tsx`**

### Fonctionnalités

✅ Affiche les zones de couverture en GeoJSON  
✅ Couleurs basées sur le score de couverture  
✅ Popup avec informations au clic  
✅ Effet hover  
✅ Compatible avec le format API backend

### Utilisation

```typescript
import { GeoJSONLayer } from '@/components/map/GeoJSONLayer';
import { useCoverage } from '@/hooks/useCoverage';

function MapPage() {
  const { coverage } = useCoverage({ region: 'ile-de-france' });

  return (
    <Map>
      {coverage && <GeoJSONLayer data={coverage} />}
    </Map>
  );
}
```

---

## 📐 Format GeoJSON Attendu

Le backend doit renvoyer des **objets GeoJSON standard** :

### Points (pour stations)

```json
{
  "type": "Point",
  "coordinates": [2.3522, 48.8566]
}
```

### Polygons (pour zones de couverture)

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [2.3522, 48.8566],
      [2.3532, 48.8566],
      [2.3532, 48.8576],
      [2.3522, 48.8576],
      [2.3522, 48.8566]
    ]
  ]
}
```

### FeatureCollection (pour heat map)

```json
{
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
        "population": 450
      }
    }
  ]
}
```

---

## 🎨 Rendu des Couleurs

Le composant `GeoJSONLayer` colorie automatiquement les zones selon le score de couverture :

| Score | Couleur | Label |
|-------|---------|-------|
| 0.8 - 1.0 | 🔵 Bleu `#3b82f6` | Excellente |
| 0.6 - 0.8 | 🟢 Vert `#22c55e` | Bonne |
| 0.4 - 0.6 | 🟠 Orange `#f59e0b` | Moyenne |
| 0.2 - 0.4 | 🟠 Orange foncé `#f97316` | Faible |
| 0 - 0.2 | 🔴 Rouge `#ef4444` | Très faible |

---

## 🧪 Test du Support GeoJSON

Pour vérifier que le backend renvoie un GeoJSON valide :

### Validation en ligne

Copiez votre JSON dans : https://geojson.io/

✅ Si la carte s'affiche → GeoJSON valide  
❌ Si erreur → Format incorrect

### Test avec curl

```bash
# Tester l'endpoint coverage
curl http://localhost:8000/api/v1/mobility/coverage?region=ile-de-france | jq '.data.zones[0].geometry'

# Doit afficher :
{
  "type": "Polygon",
  "coordinates": [[[lng, lat], ...]]
}
```

---

## 📝 Checklist Backend

Avant d'ouvrir la PR, vérifier :

- [ ] Les `geometry` suivent le standard GeoJSON
- [ ] Type `Point` pour les stations
- [ ] Type `Polygon` pour les zones de couverture
- [ ] Type `FeatureCollection` pour la heat map
- [ ] Coordonnées au format `[longitude, latitude]`
- [ ] Propriétés dans l'objet `properties`

---

## 🔗 Ressources

- **Spécification GeoJSON** : https://geojson.org/
- **Leaflet GeoJSON** : https://leafletjs.com/reference.html#geojson
- **React-Leaflet GeoJSON** : https://react-leaflet.js.org/docs/api-components/#geojson
- **Validateur en ligne** : https://geojson.io/

---

## ✅ Conclusion

✅ **Leaflet est 100% compatible GeoJSON**  
✅ **Composant GeoJSONLayer créé et prêt**  
✅ **Pas de bibliothèque supplémentaire nécessaire**

**Le frontend est prêt à recevoir des données GeoJSON du backend !** 🚀

---

**Pour toute question, consultez :**
- `API_CONTRACT_VALIDATION.md` (validation complète du contrat)
- `components/map/GeoJSONLayer.tsx` (exemple d'utilisation)
