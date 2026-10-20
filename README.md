<<<<<<< HEAD
# 🚀 Hackathon Mobilité - Frontend

Interface web pour la visualisation et l'analyse de l'accessibilité à la mobilité en France.

## 📋 Stack Technique

- **Framework**: Next.js 14 (React)
- **Langage**: TypeScript
- **Styling**: Tailwind CSS
- **Cartographie**: Leaflet.js
- **Graphiques**: Recharts
- **API Client**: Axios
- **Icônes**: Lucide React

## 🚦 Installation

### Prérequis

- Node.js 18+ et npm
- API Backend en cours d'exécution sur `http://localhost:8000`

### Étapes

1. **Installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

```bash
cp .env.example .env.local
```

Éditez `.env.local` et configurez l'URL de votre API backend.

3. **Lancer le serveur de développement**

```bash
npm run dev
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du Projet

```
hackathon_mobility_frontend/
├── app/                          # Pages Next.js (App Router)
│   ├── page.tsx                  # Page d'accueil
│   ├── layout.tsx                # Layout principal
│   ├── dashboard/                # Page tableau de bord
│   ├── map/                      # Page carte interactive
│   └── recommendations/          # Page recommandations
├── components/                   # Composants React réutilisables
│   ├── map/                      # Composants carte
│   │   ├── Map.tsx              # Carte Leaflet
│   │   ├── HeatMapLayer.tsx     # Couche heat map
│   │   ├── StationMarkers.tsx   # Marqueurs stations
│   │   └── MapControls.tsx      # Contrôles carte
│   ├── dashboard/               # Composants dashboard
│   │   ├── StatCard.tsx         # Carte statistique
│   │   ├── PopulationChart.tsx  # Graphique population
│   │   └── CoverageChart.tsx    # Graphique couverture
│   ├── recommendations/         # Composants recommandations
│   │   ├── RecommendationList.tsx
│   │   ├── RecommendationCard.tsx
│   │   └── BudgetForm.tsx
│   ├── filters/                 # Filtres et contrôles
│   │   ├── RegionSelector.tsx
│   │   ├── TransportTypeFilter.tsx
│   │   └── DateRangePicker.tsx
│   └── ui/                      # Composants UI génériques
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       └── Spinner.tsx
├── lib/                         # Utilitaires et services
│   ├── api.ts                   # Service API (Axios)
│   ├── utils.ts                 # Fonctions utilitaires
│   └── constants.ts             # Constantes
├── types/                       # Types TypeScript
│   └── api.ts                   # Types API
├── hooks/                       # Custom React Hooks
│   ├── useStations.ts
│   ├── useCoverage.ts
│   └── useRecommendations.ts
├── public/                      # Assets statiques
│   └── images/
├── API_SPECIFICATION.md         # 📄 Spécification API complète
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 🗺️ Fonctionnalités Principales

### 1. Carte Interactive

- Affichage de la heat map de couverture
- Visualisation des stations par type
- Filtres par région et type de transport
- Popup d'informations sur les stations
- Zoom et navigation

### 2. Tableau de Bord

- Statistiques globales de couverture
- Graphiques de répartition de la population
- Indicateurs clés (KPIs)
- Comparaison par région

### 3. Recommandations

- Formulaire de configuration du budget
- Liste des emplacements recommandés
- Simulation d'impact
- Visualisation sur carte
- Export des résultats

## 🔌 Intégration Backend

### Configuration API

L'URL de l'API backend est configurée dans `.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Exemple d'utilisation

```typescript
import { api } from '@/lib/api';

// Récupérer les données de couverture
const coverage = await api.getCoverage({
  region: 'ile-de-france',
  resolution: '200m'
});

// Obtenir des recommandations
const recommendations = await api.getRecommendations({
  region: 'ile-de-france',
  budget: 500000,
  transport_types: ['carsharing', 'bike'],
  constraints: {
    min_population: 1000,
    prioritize: 'underserved_areas'
  },
  cost_estimates: {
    carsharing: 50000,
    bike: 30000
  }
});
```

### Documentation API Complète

Consultez [API_SPECIFICATION.md](./API_SPECIFICATION.md) pour :
- Tous les endpoints disponibles
- Paramètres de requête
- Formats de réponse
- Exemples de code
- Codes d'erreur

## 🎨 Design System

### Couleurs Principales

```typescript
// Palette primaire (bleu)
primary-50:  #eff6ff
primary-500: #3b82f6
primary-700: #1d4ed8

// Couleurs par type de transport
bus:        #3b82f6  (bleu)
metro:      #ef4444  (rouge)
tram:       #10b981  (vert)
bike:       #f59e0b  (orange)
carsharing: #8b5cf6  (violet)
scooter:    #ec4899  (rose)
```

### Composants UI

Tous les composants suivent les conventions Tailwind CSS.

## 📊 Data Flow

```
API Backend (FastAPI)
      ↓
axios (lib/api.ts)
      ↓
React Hooks (useStations, useCoverage...)
      ↓
Components (Map, Dashboard, Recommendations)
      ↓
User Interface
```

## 🧪 Scripts Disponibles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Démarrer en production
npm run start

# Linter
npm run lint

# Formater le code
npm run format
```

## 🔧 Configuration

### TypeScript

Le projet utilise TypeScript strict mode. Tous les types API sont définis dans `types/api.ts`.

### Tailwind CSS

Configuration dans `tailwind.config.ts` avec palette personnalisée pour le projet.

### ESLint

Configuration Next.js par défaut avec règles supplémentaires.

## 📦 Dépendances Principales

| Package | Version | Utilisation |
|---------|---------|-------------|
| next | ^14.2.0 | Framework React |
| react | ^18.3.1 | Library UI |
| typescript | ^5 | Typage |
| tailwindcss | ^3.4.0 | Styling |
| leaflet | ^1.9.4 | Cartographie |
| react-leaflet | ^4.2.1 | Leaflet + React |
| recharts | ^2.12.0 | Graphiques |
| axios | ^1.7.0 | HTTP Client |
| lucide-react | ^0.400.0 | Icônes |

## 🚨 Problèmes Courants

### CORS

Si vous avez des erreurs CORS, assurez-vous que l'API backend autorise les requêtes depuis `http://localhost:3000`.

### Leaflet et Next.js

Leaflet nécessite un import dynamique en Next.js (SSR). Utilisez :

```typescript
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/map/Map'), {
  ssr: false,
  loading: () => <p>Chargement de la carte...</p>
});
```

### Variables d'environnement

Les variables côté client doivent commencer par `NEXT_PUBLIC_`.

## 🤝 Contribution

1. Créer une branche feature : `git checkout -b feature/ma-fonctionnalite`
2. Commiter les changes : `git commit -m "feat: ajout de ma fonctionnalité"`
3. Push : `git push origin feature/ma-fonctionnalite`
4. Créer une Pull Request

## 📝 Convention de Commits

Utiliser la convention [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatage
- `refactor:` Refactorisation
- `test:` Tests
- `chore:` Tâches diverses

## 👥 Équipe

- **Frontend**: Votre nom
- **Backend**: [Noms équipe backend]
- **Data Science**: [Noms équipe data]

## 📄 Licence

Projet du Hackathon Mobilité - EPITECH 2026

---

**Dernière mise à jour**: 19 octobre 2026

Pour toute question, contactez l'équipe ! 🚀
=======
# Hackathon Mobility — Citiz × Microsoft × Epitech

**De l'open data aux décisions d'implantation.**
Qui a réellement accès à une option de mobilité près de chez soi, et où faut-il en ajouter ?

Outil d'aide à la décision qui :
1. cartographie l'accessibilité à la mobilité (options accessibles à 5 min à pied, par habitant) ;
2. montre la population desservie par chaque arrêt / station ;
3. recommande où implanter de nouvelles stations Citiz, arrêts de bus et stations vélo, sous contrainte de budget.

Le détail du projet, des attendus et de la répartition du travail est dans [docs/PROJET.md](docs/PROJET.md).
Le sujet officiel est dans [docs/sujet_hackathon_mobility.pdf](docs/sujet_hackathon_mobility.pdf).

## Structure

```
data/raw/          données brutes téléchargées (non versionnées)
data/processed/    données nettoyées / jointes (non versionnées)
src/ingestion/     scripts de collecte des données brutes (INSEE, GBFS dont Citiz, GTFS)
fabric/            notebooks Microsoft Fabric de chargement dans le Lakehouse (voir fabric/README.md)
src/accessibility/ isochrones 5 min, score d'accessibilité, population desservie
src/model/         modèle prédictif de valeur d'un emplacement
src/optimization/  coûts + sélection des emplacements sous budget
app/               application de démo (carte interactive)
notebooks/         exploration, évaluation du modèle
slides/            présentation de la soutenance
docs/              sujet, documentation technique
DATA_SOURCES.md    liste des sources utilisées (livrable)
```

## Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Données

Les données brutes sont chargées dans le Lakehouse Fabric `LakeHouseZ` (espace HackathonZ) : voir [fabric/README.md](fabric/README.md) et le dictionnaire des tables [docs/DONNEES.md](docs/DONNEES.md).

Pour les récupérer en local (sortie dans `data/raw/tables/*.parquet`) :

```bash
python -m src.ingestion.insee
python -m src.ingestion.gbfs
python -m src.ingestion.gtfs   # zone Bordeaux par défaut
```

## Conventions d'équipe

- Une branche par personne / par tâche (`data/gtfs`, `access/isochrones`, `model/v1`…), pull request vers `dev` (branche d'intégration), puis `dev` vers `main` pour les versions stables.
- On ne commit jamais de données : on commit le script qui les télécharge.
- Toute nouvelle source de données est ajoutée immédiatement dans `DATA_SOURCES.md`.
- Les fichiers échangés entre modules sont en GeoParquet dans `data/processed/`, en projection Lambert 93 (EPSG:2154) pour les calculs de distance, WGS84 (EPSG:4326) pour l'affichage.
>>>>>>> origin/dev
