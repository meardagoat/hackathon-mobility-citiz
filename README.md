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

## Frontend (Next.js)

Application de démo à la racine du dépôt (`app/`, `components/`, `hooks/`, `lib/`, `types/`). Elle consomme l'API du backend (`backend/README.md`) et n'affiche que ses réponses : en cas d'erreur, un message d'erreur, jamais de données de remplacement.

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, par défaut http://localhost:8000/api/v1
npm ci
npm run dev                  # http://localhost:3000, backend lancé à part
npm run build
```

`node test-backend.js` vérifie que le backend répond sur chaque endpoint.

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
