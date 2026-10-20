# Hackathon Mobility — Citiz × Microsoft × Epitech

## Sommaire

- [Présentation](#présentation)
- [Équipe](#équipe)
- [Architecture](#architecture)
- [Lancer le projet dans Microsoft Fabric](#lancer-le-projet-dans-microsoft-fabric)
- [Rapport Power BI](#rapport-power-bi)
- [Résultats clés](#résultats-clés)
- [Lancer l'application](#lancer-lapplication)
- [Structure](#structure)
- [Installation](#installation)
- [Données](#données)
- [Conventions d'équipe](#conventions-déquipe)

## Présentation

**De l'open data aux décisions d'implantation.**
Qui a réellement accès à une option de mobilité près de chez soi, et où faut-il en ajouter ?

Outil d'aide à la décision pour Citiz (autopartage). Il montre où les habitants n'ont pas de transport à moins de 5 minutes à pied (400 m à vol d'oiseau). Il propose où ouvrir de nouvelles stations pour toucher le plus d'habitants avec un budget donné. Zone d'étude : Bordeaux Métropole (28 communes).

L'outil :
1. cartographie l'accessibilité à la mobilité (options accessibles à 5 min à pied, par habitant) ;
2. montre la population desservie par chaque arrêt / station ;
3. recommande où implanter de nouvelles stations Citiz, arrêts de bus et stations vélo, sous contrainte de budget.

Le détail du projet, des attendus et de la répartition du travail est dans [docs/PROJET.md](docs/PROJET.md).
Le sujet officiel est dans [docs/sujet_hackathon_mobility.pdf](docs/sujet_hackathon_mobility.pdf).

## Équipe

| Membre | Rôle |
|---|---|
| Abdoul Kane | Collecte des données (INSEE, GBFS, GTFS) |
| Catrielle Michelle Kotti | Accessibilité, modèle et recommandations |
| Danlyn Bayan Medou | Backend et API |
| Mariane Aurore Njimegne Kouosseu | Microsoft Fabric, intégration, rapport Power BI, démonstration |

## Architecture

Le schéma et la description de la chaîne de traitement sont dans [docs/architecture.md](docs/architecture.md).
Les tables produites pour Power BI et le backend sont décrites dans [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md).

## Lancer le projet dans Microsoft Fabric

1. Créer un espace de travail Fabric avec une capacité active (espace utilisé par l'équipe : **HackathonZ**).
2. Créer un Lakehouse (utilisé par l'équipe : **LakeHouseZ**, schémas activés).
3. Importer les notebooks de [fabric/notebooks/](fabric/notebooks/) : **Importer → Notebook → Depuis cet ordinateur**. Une fois `00_synchro_github` en place, il crée ou met à jour les autres notebooks depuis GitHub (liste dans `fabric/notebooks/manifest.json`).
4. Rattacher chaque notebook au Lakehouse : **Explorer → Add data items → From OneLake catalog** → `LakeHouseZ`.
5. Exécuter les notebooks dans cet ordre :
   1. `00_synchro_github` : récupère la dernière version des notebooks depuis le dépôt ;
   2. `01_collecte_insee` : population par carreau de 200 m ;
   3. `02_collecte_gbfs` : stations Citiz et vélos en libre-service ;
   4. `03_collecte_gtfs` : arrêts de bus, tram et bateau ;
   5. `04_accessibilite` : options à 400 m par carreau, population desservie par arrêt ;
   6. `05_score_classement` : modèle, coûts et classement sous budget.
6. Ouvrir le rapport Power BI.

Le détail (paramètres, règles de chargement, synchronisation GitHub) est dans [fabric/README.md](fabric/README.md).

## Rapport Power BI

Le rapport s'appuie sur le modèle sémantique **modele_mobilite_bordeaux-citiz** (mode Direct Lake sur SQL). Il utilise les tables `carreaux`, `offre_existante`, `recommandations`, `impacts` et la vue `v_carreaux_acces`.

| Page | Contenu |
|---|---|
| Diagnostic | Niveau d'accès (`classe_acces`, de 1 à 5) par carreau de 200 m. Les carreaux masqués sont exclus (secret statistique INSEE : moins de 11 ménages). |
| Offre existante | Arrêts et stations par type (bus, tram, vélo, Citiz, bateau…) avec les habitants desservis. Segment par type. |
| Recommandations | Segments budget (100 k€, 250 k€, 500 k€, 1 M€) et périmètre (`citiz` ou `tous`). Carte des emplacements et tableau classé par rang. |

Le script de la vue `v_carreaux_acces` est dans [docs/architecture.md](docs/architecture.md#vues-pour-power-bi).

## Résultats clés

Chiffres à revérifier après la régénération des données.

Couverture actuelle à 5 min à pied (part des habitants) :

| Type | Couverture |
|---|---|
| Bus / tram | 96,5 % |
| Vélo | 40,2 % |
| Citiz | 26,6 % |

Avec 1 M€ investis dans Citiz (coût sur 3 ans) :
- 29 stations ;
- environ 107 000 habitants nouvellement desservis ;
- couverture Citiz portée à 40,4 % ;
- environ 232 voitures en moins (8 par station).

Évaluation du modèle (AUC en validation croisée spatiale) : Citiz 0,94, vélo 0,92, bus 0,66.

## Lancer l'application

Le backend (API FastAPI) est documenté dans [backend/README.md](backend/README.md) : lancement, configuration, contrat de l'API et passage aux données réelles.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload    # données factices, http://localhost:8000
```

Avec les données réelles : `DATA_MODE=real DATA_DIR=/chemin/vers/gold uvicorn app.main:app --reload`.

Interface de démonstration (`app/`) : à compléter.

## Structure

```
data/raw/          données brutes téléchargées (non versionnées)
data/processed/    données nettoyées / jointes (non versionnées)
src/ingestion/     scripts de collecte des données brutes (INSEE, GBFS dont Citiz, GTFS)
fabric/            notebooks Microsoft Fabric de chargement dans le Lakehouse (voir fabric/README.md)
backend/           API FastAPI (voir backend/README.md)
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
