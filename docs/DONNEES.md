# Dictionnaire des données brutes

Tables Delta du Lakehouse Fabric `LakeHouseZ` de l'espace HackathonZ (copies Parquet dans `Files/raw/tables/`, ou `data/raw/tables/` en local).
Sources et licences : [DATA_SOURCES.md](../DATA_SOURCES.md). Chargement : [fabric/README.md](../fabric/README.md).

Conventions communes à toutes les tables :
- `licence` : code de licence du jeu sur le Point d'Accès National (`lov2` Licence Ouverte 2.0, `odc-odbl` ODbL : obligation de partage à l'identique des bases dérivées, `notspecified` non précisée) ;
- `date_collecte` : horodatage UTC de la collecte ;
- `jeu_id` / `ressource_id` : identifiants du jeu et de la ressource sur transport.data.gouv.fr (traçabilité) ;
- coordonnées en **WGS84** (`lat`, `lon`), sauf mention contraire.

Volumes indiqués pour la collecte du 2026-10-19.

---

## INSEE

### `insee_carreaux_200m`: population au carreau de 200 m (2,3 M lignes)

Une ligne par carreau habité de 200 m × 200 m (Filosofi 2021 : Métropole, Martinique, La Réunion). Population totale ≈ 63,8 M habitants.

| Colonne | Description |
|---|---|
| `territoire` | Métropole, Martinique ou La Réunion |
| `idcar_200m` | Identifiant INSEE du carreau (code la projection et le coin sud-ouest) |
| `idcar_1km`, `idcar_nat` | Carreau de 1 km et carreau de regroupement utilisé pour le secret statistique |
| `i_est_200`, `i_est_1km` | 1 si les valeurs du carreau sont imputées (carreau trop peu peuplé, secret statistique) |
| `lcog_geo` | Code(s) commune(s) INSEE du carreau (ex. `33063` = Bordeaux) |
| `ind` | **Nombre d'habitants** |
| `men` | Nombre de ménages |
| `men_pauv` | Ménages pauvres |
| `men_1ind`, `men_5ind` | Ménages d'une personne / de 5 personnes ou plus |
| `men_prop` | Ménages propriétaires |
| `men_fmp` | Familles monoparentales |
| `ind_snv` | Somme des niveaux de vie (revenu moyen = `ind_snv / ind`) |
| `men_surf` | Surface cumulée des logements |
| `men_coll`, `men_mais` | Ménages en logement collectif / en maison |
| `log_av45` … `log_ap90`, `log_inc` | Logements par période de construction |
| `log_soc` | Logements sociaux |
| `ind_0_3` … `ind_80p`, `ind_inc` | Habitants par tranche d'âge |
| `epsg` | Projection de l'identifiant : 3035 (Métropole), 5490 (Martinique), 2975 (Réunion) |
| `x_centre`, `y_centre` | Centre du carreau dans la projection `epsg` (mètres) |
| `lon`, `lat` | Centre du carreau en WGS84 |

Les valeurs peuvent être décimales : l'INSEE répartit les ménages pour respecter le secret statistique.

---

## GBFS : mobilités partagées

### `gbfs_flux`: catalogue des flux (178 lignes)

Un flux GBFS publié sur le Point d'Accès National, avec son statut de collecte.
Colonnes : `jeu_titre`, `producteur`, `sous_types` (bicycle, scooter, carsharing, freefloating), `est_citiz`, `licence`, `url`, `page_pan`, `version_gbfs`, `statut` (`ok` ou message d'erreur), `erreurs_partielles`, `nb_stations`, `nb_vehicules`, `donnees_precedentes` (flux en erreur : ses stations et types de véhicules de la collecte précédente sont conservés, avec leur `date_collecte` d'origine).

### `gbfs_stations`: stations fixes

| Colonne | Description |
|---|---|
| `systeme_id`, `systeme_nom`, `operateur` | Système GBFS et opérateur (ex. Citiz Grand Est) |
| `est_citiz` | `true` pour les stations Citiz |
| `types_vehicules` | Types de véhicules du système : `bicycle`, `scooter_standing`, `car`, `cargo_bicycle`… |
| `station_id`, `nom`, `adresse`, `code_postal` | Identification de la station |
| `lat`, `lon` | Position |
| `capacite` | Nombre de places (bornes vélo, places de voiture) |

### `gbfs_types_vehicules`
Types de véhicules par système : `vehicle_type_id`, `form_factor` (bicycle, car, scooter_standing…), `propulsion_type` (human, electric_assist, combustion…), `nom`.

### `gbfs_etat_stations`: historique de disponibilité
Une ligne par station et par collecte : `station_id`, `vehicules_disponibles`, `places_disponibles`, `est_installee`, `est_en_location`, `derniere_maj`. **La table s'enrichit à chaque exécution** du notebook GBFS : chaque photo est ajoutée à la table Delta (la copie Parquet de `Files/raw/tables/` ne contient que la dernière photo, les précédentes sont dans `Files/raw/historique/`).

### `gbfs_vehicules`: historique des véhicules
Une ligne par véhicule visible et par collecte : `vehicule_id`, `vehicle_type_id`, `station_id` (autopartage en station, dont Citiz) ou `lat`/`lon` (free-floating), `est_reserve`, `est_indisponible`.

Pour Citiz : jointure `gbfs_vehicules.station_id = gbfs_stations.station_id` sur le même `ressource_id`.

---

## GTFS : transports en commun

### `gtfs_catalogue`: GTFS publiés en France (565 lignes)
`jeu_titre`, `producteur`, `licence`, `zones_couvertes`, `zones_insee`, `types_zones` (commune, epci, region…), `modes` (bus, tramway, metro, rail…), `reseaux`, `date_fin_validite`, `disponible`, `mise_a_jour` (dernière publication de la ressource), `url`, `page_pan`.

### `gtfs_arrets_france`: tous les arrêts de France (638 000 lignes, 418 jeux)
Agrégat national publié par transport.data.gouv.fr, **non dédoublonné** (un même arrêt peut apparaître dans plusieurs jeux).
Colonnes : `dataset_custom_title`, `dataset_organisation`, `dataset_id`, `resource_id`, `stop_id`, `stop_name`, `stop_lat`, `stop_lon`, `location_type` (0 = point d'arrêt, 1 = zone d'arrêt / station, 2 = entrée), `agency_id`, `agency_name`, `fichier_source` (export utilisé), `licence_reseau` (licence du GTFS d'origine, vide si ce GTFS n'est plus publié).
Cette table ne contient pas le mode de transport : il s'obtient via les GTFS complets ci-dessous.

### `gtfs_ressources`: statut de lecture des GTFS de la zone d'étude
Une ligne par GTFS sélectionné : `ressource_id`, `jeu_titre`, `url`, `licence`, `mise_a_jour`, `statut` (`ok` ou message d'erreur), `fichiers` (fichiers lus), `nb_arrets`.
Un GTFS dont un fichier est illisible n'est pas lu partiellement (statut en erreur) : les tables ci-dessous ne contiennent jamais un réseau partiel, par exemple des arrêts sans courses. Ses données de la collecte précédente sont conservées telles quelles (`donnees_precedentes` = vrai, `date_collecte` d'origine).

### GTFS complets de la zone d'étude
Fichiers GTFS standards, concaténés pour tous les réseaux sélectionnés (paramètre `ZONE`, par défaut Bordeaux Métropole + Gironde : TBM, cars régionaux de Gironde, bac, navette aéroport, Sud Gironde ; les agrégats régionaux sont exclus car ils dupliquent ces réseaux). Toutes les colonnes d'origine sont conservées (texte), plus `ressource_id` et `jeu_titre`. Spécification : https://gtfs.org/schedule/reference/

| Table | Contenu | Zone Bordeaux / Gironde |
|---|---|---|
| `gtfs_agency` | Exploitants | 5 |
| `gtfs_routes` | Lignes ; `route_type` : 0 tram, 1 métro, 2 train, 3 bus… | 309 (TBM : 6 tram, 193 bus, 3 bateaux ; Gironde : 93 cars, 2 bacs ; Sud Gironde : 11 bus ; navette : 1) |
| `gtfs_stops` | Arrêts du réseau (`stop_lat`, `stop_lon` numériques) | 13 771 |
| `gtfs_trips` | Courses | 78 475 |
| `gtfs_calendar`, `gtfs_calendar_dates` | Jours de circulation | 344 / 8 120 |
| `gtfs_stop_times` | Horaires de passage à chaque arrêt | 2 930 348 |

Mode d'un arrêt : `gtfs_stop_times` → `gtfs_trips` (`trip_id`) → `gtfs_routes` (`route_id`) → `route_type`.
Fréquence de passage : nombre de lignes de `gtfs_stop_times` par `stop_id` sur un jour type.
