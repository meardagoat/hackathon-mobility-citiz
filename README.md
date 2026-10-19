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
src/ingestion/     scripts de téléchargement et nettoyage (GTFS, GBFS, INSEE, IGN, OSM)
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

## Conventions d'équipe

- Une branche par personne / par tâche (`data/gtfs`, `access/isochrones`, `model/v1`…), merge sur `main` via pull request.
- On ne commit jamais de données : on commit le script qui les télécharge.
- Toute nouvelle source de données est ajoutée immédiatement dans `DATA_SOURCES.md`.
- Les fichiers échangés entre modules sont en GeoParquet dans `data/processed/`, en projection Lambert 93 (EPSG:2154) pour les calculs de distance, WGS84 (EPSG:4326) pour l'affichage.
