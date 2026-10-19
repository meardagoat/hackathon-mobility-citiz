# Chargement des données dans Microsoft Fabric

Trois notebooks collectent les données open data et les chargent dans un Lakehouse Fabric :

| Notebook | Données | Durée indicative |
|---|---|---|
| `notebooks/01_collecte_insee.ipynb` | Population et revenus au carreau de 200 m (INSEE Filosofi 2021) | ~3 min |
| `notebooks/02_collecte_gbfs.ipynb` | Stations et véhicules partagés : vélos, trottinettes, autopartage dont Citiz (GBFS) | ~5-10 min (~1 min en mode Citiz seul) |
| `notebooks/03_collecte_gtfs.ipynb` | Arrêts de France + lignes et horaires des réseaux de la zone d'étude (GTFS) | ~3 min |

Le détail des tables produites est dans [docs/DONNEES.md](../docs/DONNEES.md).

## Mise en place (une seule fois)

Espace de travail : **Microsoft x Citiz x Epitech**, Lakehouse **`LakeHouseMicrosoft`** (schémas activés : tables dans `dbo`).

1. **Importer → Notebook → Depuis cet ordinateur**, puis sélectionner les 3 fichiers `.ipynb` de `fabric/notebooks/`.
2. Dans chaque notebook, panneau **Explorer → Add data items → From OneLake catalog** → `LakeHouseMicrosoft` (il devient le Lakehouse par défaut).

Les notebooks sont des **notebooks Python** (2 vCores, sans Spark) : ils démarrent en quelques secondes et consomment peu de capacité, ce qui compte car la capacité d'essai est partagée (erreur `TooManyRequestsForCapacity` quand elle est saturée : attendre quelques minutes et relancer).

## Exécution

Ouvrir chaque notebook, ajuster si besoin la cellule de paramètres, puis **Exécuter tout**.

- `03_collecte_gtfs` : le paramètre `ZONE` choisit les réseaux dont on charge les GTFS complets (mots-clés sur la ville, le réseau ou le code INSEE ; `["*"]` = toute la France, plusieurs Go). Par défaut : Bordeaux Métropole et Gironde.
- `02_collecte_gbfs` : chaque exécution **ajoute** une photo de l'état des stations et véhicules aux tables `gbfs_etat_stations` et `gbfs_vehicules`. Pour constituer un historique de disponibilité, planifier le notebook : **Exécuter → Planifier**, toutes les 30 minutes.

## Résultat dans le Lakehouse

```
LakeHouseMicrosoft
├── Files/raw/
│   ├── insee/   fichier ZIP INSEE d'origine
│   ├── gbfs/    réponses JSON brutes de chaque flux GBFS
│   ├── gtfs/    agrégat national des arrêts (CSV) + ZIP GTFS de la zone
│   └── tables/  copies Parquet des tables
└── Tables/dbo/  tables Delta, interrogeables en SQL (point de terminaison SQL) et Power BI
```

Les tables sont accessibles depuis n'importe quel notebook de l'espace de travail :

```python
import duckdb  # notebook Python
df = duckdb.sql("SELECT * FROM delta_scan('/lakehouse/default/Tables/dbo/gbfs_stations') WHERE est_citiz").df()

df = spark.read.table("LakeHouseMicrosoft.dbo.gbfs_stations")  # notebook PySpark
```

ou en SQL via le point de terminaison SQL du Lakehouse :

```sql
SELECT systeme_nom, COUNT(*) AS stations FROM gbfs_stations WHERE est_citiz = 1 GROUP BY systeme_nom;
```

## Synchroniser Fabric avec GitHub

L'intégration Git native de Fabric n'accepte pas GitHub sur notre tenant (seul Azure DevOps est proposé). Le notebook **`00_sync_github`** la remplace, dans un seul sens : **le dépôt fait foi**.

1. Fusionner les modifications dans la branche voulue (par défaut `main`).
2. Dans Fabric, ouvrir `00_sync_github`, ajuster si besoin `BRANCHE`, puis **Exécuter tout**.
3. Les notebooks listés dans `fabric/notebooks/manifest.json` sont mis à jour (ou créés) et rattachés au Lakehouse `LakeHouseMicrosoft`.

Les notebooks qui ne sont pas dans le dépôt (ex. créés par un coéquipier directement dans Fabric) ne sont jamais touchés. En revanche, une modification faite dans Fabric sur un notebook synchronisé est **écrasée** à la synchronisation suivante : il faut modifier le code dans le dépôt. Si un notebook synchronisé est ouvert pendant la synchronisation, Fabric affiche « Another user has saved changes » : cliquer sur **View changes** puis **Keep this version** côté *Saved version*.

## Modifier la collecte

Les notebooks sont **générés** à partir des scripts de `src/ingestion/`. Pour modifier la collecte :

1. modifier le script concerné dans `src/ingestion/` ;
2. le tester en local : `python -m src.ingestion.gbfs` (sortie dans `data/raw/`) ;
3. régénérer les notebooks : `python fabric/build_notebooks.py` ;
4. réimporter le notebook modifié dans Fabric.
