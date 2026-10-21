# 🚀 Démarrage Rapide - Intégration Frontend + Backend

## 📋 Checklist 5 Minutes

### 1️⃣ Lancer le Backend (Terminal 1)

```bash
# Aller dans le dossier backend
cd backend

# Activer l'environnement virtuel et lancer
.venv/bin/uvicorn app.main:app --reload
```

**✅ Vérification :** Vous devez voir :
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**🌐 Tester dans le navigateur :**
- Swagger UI : http://localhost:8000/docs
- Health Check : http://localhost:8000/api/v1/health

---

### 2️⃣ Vérifier la Connexion (Terminal 2)

```bash
# Depuis le dossier frontend
cd hackathon_mobility_frontend

# Tester tous les endpoints
node test-backend.js
```

**✅ Attendu :** `✨ Résultat: 6/6 tests réussis`

---

### 3️⃣ Lancer le Frontend (Terminal 2)

```bash
# Installer les dépendances si pas encore fait
npm install

# Lancer le dev server
npm run dev
```

**✅ Vérification :**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

---

### 4️⃣ Tester dans le Navigateur

Ouvrir : http://localhost:3000

**Pages à vérifier :**
1. **Dashboard** (`/`) - KPIs et graphiques
2. **Carte** (`/map`) - Zones colorées et stations
3. **Recommandations** (`/recommendations`) - Formulaire et résultats

**Console Browser (F12) :**
Vous devez voir :
```
[API] GET /mobility/coverage
[API] GET /stations
[API] GET /statistics/summary
```

---

## 🔧 Configuration Rapide

### Fichier `.env.local` (déjà créé)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_ENV=development
```

---

## 🐛 Problèmes Courants

### ❌ Backend : "fetch failed"
**Cause :** Backend pas lancé  
**Solution :** Lancer `uvicorn` dans le dossier `backend/`

### ❌ CORS Error
**Cause :** Backend refuse les requêtes depuis localhost:3000  
**Solution :** Vérifier `CORSMiddleware` dans `backend/app/main.py`

### ❌ "Cannot find module"
**Cause :** Dépendances pas installées  
**Solution :** `npm install`

### ❌ Données vides sur le frontend
**Cause :** Format de données incompatible  
**Solution :** Vérifier dans Swagger (http://localhost:8000/docs) que les endpoints retournent bien des données

---

## 📊 Vérification des Données

### Test manuel d'un endpoint

```bash
# Windows PowerShell
curl http://localhost:8000/api/v1/stations?region=bordeaux&limit=5

# Ou dans le navigateur
http://localhost:8000/api/v1/stations?region=bordeaux&limit=5
```

**Attendu :**
```json
{
  "data": {
    "stations": [
      {
        "id_station": "...",
        "nom": "...",
        "type": "bus",
        "lat": 44.xxx,
        "lon": -0.xxx
      }
    ]
  }
}
```

---

## ✅ Tout fonctionne quand...

1. ✅ Backend répond sur http://localhost:8000
2. ✅ `node test-backend.js` → 6/6 tests OK
3. ✅ Frontend affiche sur http://localhost:3000
4. ✅ Dashboard montre des chiffres (population, couverture)
5. ✅ Map affiche des zones colorées
6. ✅ Aucune erreur CORS dans la console (F12)

---

## 🎯 Workflow de Développement

```
┌─────────────┐
│   Backend   │  Port 8000
│  (FastAPI)  │  Mode Mock
└──────┬──────┘
       │ JSON
       │ DATA_CONTRACT.md
       ▼
┌─────────────┐
│ Transformer │  lib/dataTransformers.ts
│   lat/lon   │  velo→bike, citiz→carsharing
│  → [lon,lat]│  Backend types → Frontend types
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │  Port 3000
│  (Next.js)  │  GeoJSON [lon,lat]
└─────────────┘
```

---

## 📚 Documentation

- **Contrat Backend** : `DATA_CONTRACT.md` (dans repo backend)
- **API Frontend** : `API_SPECIFICATION.md`
- **Guide Complet** : `INTEGRATION_BACKEND.md`
- **Transformations** : `lib/dataTransformers.ts`

---

## 💡 Tips

1. **Swagger** = votre meilleur ami : http://localhost:8000/docs
2. **Console Browser F12** = voir les appels API en temps réel
3. **Mode Mock** = pas besoin du Lakehouse pour développer
4. **Données masquées** = normal si population < 11 ménages

---

## 🚀 Prêt pour la Démo !

Une fois que tout fonctionne :
1. Préparez vos filtres (Dashboard, Map, Recommendations)
2. Testez un scénario complet
3. Prenez des screenshots pour la présentation
4. Commit + Push le code final

**Bon courage ! 🎉**
