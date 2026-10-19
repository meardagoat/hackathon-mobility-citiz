# 🧪 Guide de Test - Frontend Hackathon Mobilité

## ✅ Corrections Appliquées

### 1. **Import renderToString supprimé**
- **Fichier :** `components/map/StationMarkers.tsx`
- **Raison :** Import inutilisé qui peut causer des erreurs avec Leaflet en mode client

### 2. **Tailwind config étendu**
- **Fichier :** `tailwind.config.ts`
- **Ajout :** `"./hooks/**/*.{js,ts,jsx,tsx,mdx}"` dans content

### 3. **Next.js config avec transpilePackages**
- **Fichier :** `next.config.ts`
- **Ajout :** `transpilePackages: ['leaflet', 'react-leaflet']`

---

## 🚀 Comment Tester le Projet

### Option 1 : Script PowerShell (Recommandé)
```powershell
.\Test-Project.ps1
```
Ce script va :
- Vérifier Node.js et npm
- Vérifier les dépendances
- Lancer `npm run build`
- Proposer de démarrer `npm run dev`

### Option 2 : Script Batch
```batch
test-build.bat
```
Pour tester uniquement le build.

```batch
test-dev.bat
```
Pour démarrer directement le serveur de développement.

### Option 3 : Manuellement
```bash
# Dans un terminal Windows (cmd ou PowerShell)
cd c:\Users\prosp\Desktop\hackathon_mobility_frontend

# Test build
npm run build

# Si le build réussit, lancer le serveur
npm run dev
```

---

## 📋 Checklist de Vérification

- [x] Tous les fichiers requis existent
- [x] Tous les imports sont valides
- [x] Configuration TypeScript correcte
- [x] Configuration Tailwind correcte
- [x] Configuration Next.js avec transpilePackages pour Leaflet
- [x] Import renderToString supprimé
- [x] `.env.local` configuré avec l'URL de l'API

---

## 🌐 Accès à l'Application

Une fois `npm run dev` lancé, l'application sera accessible sur :

**http://localhost:3000**

### Pages disponibles :
- **/** - Dashboard avec statistiques
- **/map** - Carte interactive avec stations
- **/recommendations** - Recommandations IA

---

## 🔧 Configuration API

L'application est configurée pour se connecter à :
```
http://localhost:8000/api/v1
```

**Note :** Si l'API backend n'est pas disponible, l'application utilisera automatiquement des données fictives (mock data) pour permettre de tester l'interface.

---

## 🎨 Design

- **Sidebar noire** (#111111) comme demandé
- **Interface professionnelle** avec composants UI réutilisables
- **Responsive** (optimisé pour desktop)
- **Icônes** : Lucide React
- **Graphiques** : Recharts
- **Carte** : Leaflet + React-Leaflet

---

## ⚠️ En Cas d'Erreur

### Erreur TypeScript
Si vous voyez des erreurs TypeScript lors du build :
1. Vérifiez que `node_modules` existe (sinon : `npm install`)
2. Supprimez `.next` et relancez : `npm run build`

### Erreur Leaflet
Si vous voyez des erreurs liées à Leaflet :
- Vérifiez que `transpilePackages` est bien dans `next.config.ts`
- Les composants Map doivent être importés avec `dynamic import` et `ssr: false`

### Port déjà utilisé
Si le port 3000 est déjà utilisé :
```bash
npm run dev -- -p 3001
```

---

## 📝 Scripts Disponibles

```json
{
  "dev": "next dev",           // Démarrer en mode développement
  "build": "next build",       // Build de production
  "start": "next start",       // Démarrer le build de production
  "lint": "next lint"          // Linter le code
}
```

---

## 📦 Dépendances Principales

- **Next.js 14.2** - Framework React
- **TypeScript 5** - Typage statique
- **Tailwind CSS 3.4** - Styles
- **Leaflet 1.9** - Cartes interactives
- **Recharts 2.12** - Graphiques
- **Lucide React** - Icônes
- **Axios 1.7** - Requêtes HTTP

---

## 📄 Fichiers de Test Créés

1. **test-build.bat** - Script batch pour tester le build
2. **test-dev.bat** - Script batch pour démarrer le dev server
3. **Test-Project.ps1** - Script PowerShell complet
4. **VERIFICATION_RAPPORT.md** - Rapport détaillé des vérifications
5. **README_TEST.md** - Ce fichier

---

## ✅ Prêt à Démarrer !

Le projet a été vérifié et corrigé. Vous pouvez maintenant exécuter :

```bash
npm run dev
```

Et accéder à http://localhost:3000

**Bonne chance pour votre hackathon ! 🚀**
