# Contrat de données — sorties data (notebooks 04 et 05)

Zone : Bordeaux Métropole (28 communes). Produit par `04_accessibilite` puis `05_score_classement`.

## Où sont les données

| Format | Emplacement (LakeHouseZ) | Usage |
|---|---|---|
| Tables Delta | `Tables/dbo/<table>` | SQL endpoint, Power BI |
| Parquet | `Files/gold/<table>.parquet` | lecture backend (pandas / pyarrow) |
| JSON | `Files/gold/export/<table>.json` | lecture backend, une liste d'objets |

Coordonnées : `lat` / `lon` en WGS84 (EPSG:4326). `x` / `y` en mètres (EPSG:3035), usage interne.
Valeur inconnue = `null`. Ordre d'exécution : 04 puis 05.

## Correspondance avec le contrat API v1.1

| Nom côté backend | Table data |
|---|---|
| zones | `carreaux` |
| stations | `offre_existante` |
| candidates | `candidats_scores` |
| sortie de `recommander()` | `recommandations` (précalculée par budget et périmètre) |
| coûts sourcés | `couts` + `hypotheses` |

## carreaux — une ligne par carreau INSEE habité de 200 m

| Colonne | Type | Sens |
|---|---|---|
| id_carreau | str | identifiant INSEE (`idcar_200m`), clé |
| code_commune | str | code INSEE de la commune (5 caractères) |
| lat, lon | float | centre du carreau |
| population | int | habitants (Filosofi 2021). JSON : `null` si `donnee_masquee`. Delta/Parquet : valeur imputée INSEE non masquée, à masquer côté backend |
| nb_options | int | arrêts + stations à moins de 400 m (tous types) |
| nb_bus, nb_tram, nb_velo, nb_citiz… | int | même chose par type (une colonne par type présent) |
| options_par_habitant | float | nb_options / population. JSON : `null` si `donnee_masquee` |
| niveau_acces | int 1–5 | 1 = aucune option à 400 m ; 2 à 5 = quartiles de `nb_options` parmi les carreaux desservis (ne dépend pas de la population, donc ne révèle rien sur les carreaux masqués) |
| couvert_citiz | bool | au moins une station Citiz à 400 m |
| donnee_masquee | bool | carreau imputé par l'INSEE (`i_est_200 = 1`, moins de 11 ménages) : ne pas afficher les chiffres |

Colonnes en plus dans Delta/Parquet uniquement : `x`, `y`, `men`, `men_coll`, `men_pauv`, `men_prop`, `ind_65_79`, `ind_80p`.

## offre_existante — une ligne par arrêt ou station existant

| Colonne | Type | Sens |
|---|---|---|
| id_station | str | identifiant unique (`gtfs_…` ou `gbfs_…`) |
| nom | str | nom de l'arrêt ou de la station |
| type | str | `bus`, `tram`, `metro`, `train`, `bateau`, `velo`, `citiz` |
| operateur | str | réseau ou opérateur |
| code_commune | str | commune du carreau habité le plus proche |
| lat, lon | float | position |
| pop_desservie | int | habitants à moins de 400 m |

Les quais d'un même arrêt sont regroupés (un arrêt = une ligne).

## candidats_scores — un emplacement possible par ligne

| Colonne | Type | Sens |
|---|---|---|
| id_candidat | str | `<type>_<id_carreau>` |
| type | str | `citiz`, `velo`, `bus` |
| lat, lon | float | centre du carreau candidat |
| code_commune | str | commune |
| cout_eur | int | coût sur l'horizon (voir `couts`) |
| pop_nouvelle | float | habitants à 400 m pas encore couverts par ce type |
| adequation | float 0–1 | probabilité du modèle (ressemblance avec les emplacements existants) |
| score | float 0–100 | valeur relative au meilleur candidat |
| valeur_par_euro | float | critère de tri du classement |

## recommandations — le classement sous budget

Une ligne par équipement choisi, pour chaque couple (`perimetre`, `budget_scenario`).

| Colonne | Type | Sens |
|---|---|---|
| rang | int | 1 = choisi en premier |
| id_candidat, type, lat, lon, code_commune | | comme `candidats_scores` |
| cout_eur | int | coût de cet équipement |
| cout_cumule_eur | int | total dépensé jusqu'à ce rang |
| pop_nouvelle | int | habitants nouvellement servis, sans double compte avec les rangs précédents |
| score | float | valeur ajoutée relative |
| adequation | float | probabilité du modèle |
| voitures_evitees | int | 8 par station Citiz, 0 sinon |
| budget_scenario | int | 100 000, 250 000, 500 000, 1 000 000 (seules valeurs disponibles) |
| perimetre | str | `tous` (citiz + velo + bus) ou `citiz` |

Filtre côté API : `perimetre = ? AND budget_scenario = ?`, trié par `rang`.

## impacts — un résumé par scénario

`perimetre`, `budget_eur`, `nb_equipements`, `cout_eur`, `habitants_nouvellement_servis`, `voitures_evitees`, et pour chaque type `part_pop_<type>_avant` / `part_pop_<type>_apres` (% des habitants à 400 m).

## couts, hypotheses, modele_eval, meta

- `couts` : `type`, `investissement`, `annuel`, `annees`, `cout_total_eur`.
- `hypotheses` : `cle`, `valeur`, `source` (sources des coûts, rayon, filtres).
- `modele_eval` : `type`, `n_carreaux`, `n_positifs`, `auc_cv_spatiale`.
- `meta` : `date_maj` (UTC), `version`, `rayon_m`.

## Méthode de couverture

- 5 min à pied = 400 m à vol d'oiseau, depuis le centre du carreau.
- Réseau TBM uniquement (cars de Gironde exclus), lignes scolaires exclues.
- GBFS : stations fixes Citiz et Le Vélo uniquement (pas de free-floating).
