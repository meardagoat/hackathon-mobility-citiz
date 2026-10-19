# Chargement des données dans Microsoft Fabric

Trois notebooks collectent les données open data et les chargent dans un Lakehouse Fabric :

| Notebook | Données | Durée indicative |
|---|---|---|
| `notebooks/01_collecte_insee.ipynb` | Population et revenus au carreau de 200 m (INSEE Filosofi 2021) | ~3 min |
| `notebooks/02_collecte_gbfs.ipynb` | Stations et véhicules partagés : vélos, trottinettes, autopartage dont Citiz (GBFS) | ~5-10 min (~1 min en mode Citiz seul) |
| `notebooks/03_collecte_gtfs.ipynb` | Arrêts de France + lignes et horaires des réseaux de la zone d'étude (GTFS) | ~3 min |

Le détail des tables produites est dans [docs/DONNEES.md](../docs/DONNEES.md).

## Mise en place (une seule fois)

1. Dans Fabric, ouvrir l'espace de travail de l'équipe.
2. **Nouveau → Lakehouse**, nommé `lh_mobilite`.
3. **Importer → Notebook → Depuis cet ordinateur**, puis sélectionner les 3 fichiers `.ipynb` de `fabric/notebooks/`.
4. Dans chaque notebook, panneau **Lakehouse** à gauche → **Ajouter** → `lh_mobilite`, défini comme Lakehouse par défaut.

## Exécution

Ouvrir chaque notebook, ajuster si besoin la cellule de paramètres, puis **Exécuter tout**.

- `03_collecte_gtfs` : le paramètre `ZONE` choisit les réseaux dont on charge les GTFS complets (mots-clés sur la ville, le réseau ou le code INSEE ; `["*"]` = toute la France, plusieurs Go).
- `02_collecte_gbfs` : chaque exécution **ajoute** une photo de l'état des stations et véhicules aux tables `gbfs_etat_stations` et `gbfs_vehicules`. Pour constituer un historique de disponibilité, planifier le notebook : **Exécuter → Planifier**, toutes les 30 minutes.

## Résultat dans le Lakehouse

```
lh_mobilite
├── Files/raw/
│   ├── insee/   fichier ZIP INSEE d'origine
│   ├── gbfs/    réponses JSON brutes de chaque flux GBFS
│   ├── gtfs/    agrégat national des arrêts (CSV) + ZIP GTFS de la zone
│   └── tables/  copies Parquet des tables
└── Tables/      tables Delta, interrogeables en SQL (point de terminaison SQL) et Power BI
```

Les tables sont accessibles depuis n'importe quel notebook de l'espace de travail :

```python
df = spark.read.table("lh_mobilite.gbfs_stations")          # Spark
pdf = df.filter("est_citiz").toPandas()                      # pandas
```

ou en SQL via le point de terminaison SQL du Lakehouse :

```sql
SELECT systeme_nom, COUNT(*) AS stations FROM gbfs_stations WHERE est_citiz = 1 GROUP BY systeme_nom;
```

## Modifier la collecte

Les notebooks sont **générés** à partir des scripts de `src/ingestion/`. Pour modifier la collecte :

1. modifier le script concerné dans `src/ingestion/` ;
2. le tester en local : `python -m src.ingestion.gbfs` (sortie dans `data/raw/`) ;
3. régénérer les notebooks : `python fabric/build_notebooks.py` ;
4. réimporter le notebook modifié dans Fabric.
