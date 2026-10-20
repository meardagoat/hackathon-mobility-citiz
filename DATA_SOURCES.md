# Sources de données

Toutes les données utilisées sont publiques. Elles sont collectées par les scripts de `src/ingestion/` et chargées dans Microsoft Fabric par les notebooks de `fabric/notebooks/` (voir [fabric/README.md](fabric/README.md)). Le détail des tables est dans [docs/DONNEES.md](docs/DONNEES.md).

## Données collectées

| Donnée | Producteur | URL | Format | Collectée le | Licence | Script / notebook | Tables |
|---|---|---|---|---|---|---|---|
| Population et revenus au carreau de 200 m (Filosofi 2021) | INSEE | https://www.insee.fr/fr/statistiques/8735162 | CSV (ZIP) | 2026-10-19 | Licence Ouverte 2.0 (Etalab) | `insee.py` / `01_collecte_insee` | `insee_carreaux_200m` |
| Stations et véhicules partagés : vélos, trottinettes, autopartage (178 flux) | Opérateurs, via le Point d'Accès National | https://transport.data.gouv.fr/datasets?type=vehicles-sharing | GBFS 1.x / 2.x / 3.0 | 2026-10-19 | Licence propre à chaque jeu (majoritairement ODbL ou Licence Ouverte), indiquée sur sa page PAN | `gbfs.py` / `02_collecte_gbfs` | `gbfs_flux`, `gbfs_stations`, `gbfs_types_vehicules`, `gbfs_etat_stations`, `gbfs_vehicules` |
| Stations et véhicules Citiz (15 réseaux régionaux) | Citiz | https://transport.data.gouv.fr/datasets?type=vehicles-sharing&q=citiz | GBFS 3.0 | 2026-10-19 | Voir pages PAN des jeux Citiz | `gbfs.py` / `02_collecte_gbfs` | idem, filtre `est_citiz = true` |
| Catalogue des GTFS publiés en France (565 ressources) | Point d'Accès National | https://transport.data.gouv.fr/api/datasets | JSON (API) | 2026-10-19 | Licence Ouverte 2.0 | `gtfs.py` / `03_collecte_gtfs` | `gtfs_catalogue` |
| Arrêts de transport en France (agrégat national GTFS, non dédoublonné, export du 2026-01-13) | transport.data.gouv.fr | https://www.data.gouv.fr/datasets/arrets-de-transport-en-france | CSV | 2026-10-19 | Licence Ouverte 2.0 / ODbL selon réseau | `gtfs.py` / `03_collecte_gtfs` | `gtfs_arrets_france` |
| GTFS complets des réseaux de la zone d'étude Bordeaux / Gironde : TBM, cars régionaux de Gironde, bac, navette aéroport, Sud Gironde | Autorités organisatrices / opérateurs | https://transport.data.gouv.fr/datasets?type=public-transit | GTFS | 2026-10-19 | Licence propre à chaque jeu, indiquée sur sa page PAN | `gtfs.py` / `03_collecte_gtfs` | `gtfs_agency`, `gtfs_routes`, `gtfs_stops`, `gtfs_trips`, `gtfs_calendar`, `gtfs_calendar_dates`, `gtfs_stop_times` |

La provenance exacte de chaque ligne est conservée : colonnes `jeu_id` / `ressource_id` (identifiants du Point d'Accès National), `page_pan` dans les catalogues, et `date_collecte` partout.

## Références de format

- GTFS : https://gtfs.org/
- GBFS : https://gbfs.org/
- Documentation Filosofi carroyé : https://www.insee.fr/fr/statistiques/8735162 (onglet Documentation)

## Autres sources citées dans le sujet (non collectées à ce stade)

| Donnée | Producteur | URL |
|---|---|---|
| Projections de population 2018-2070 (Omphale) | INSEE | https://www.insee.fr/fr/statistiques/6652134 |
| Contours administratifs et IRIS (Admin Express) | IGN | https://geoservices.ign.fr/adminexpress |
| Réseau piéton et routier | OpenStreetMap (Geofabrik) | https://download.geofabrik.de/europe/france.html |
| Catalogue mondial des flux GBFS | MobilityData | https://github.com/MobilityData/gbfs/blob/master/systems.csv |

Toute nouvelle source utilisée par l'équipe doit être ajoutée ici.
