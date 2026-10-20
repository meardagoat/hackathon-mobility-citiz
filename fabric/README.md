# Chargement des données dans Microsoft Fabric

Trois notebooks collectent les données open data et les chargent dans un Lakehouse Fabric :

| Notebook | Données | Durée indicative |
|---|---|---|
| `notebooks/01_collecte_insee.ipynb` | Population et revenus au carreau de 200 m (INSEE Filosofi 2021) | ~3 min |
| `notebooks/02_collecte_gbfs.ipynb` | Stations et véhicules partagés : vélos, trottinettes, autopartage dont Citiz (GBFS) | ~5-10 min (~1 min en mode Citiz seul) |
| `notebooks/03_collecte_gtfs.ipynb` | Arrêts de France + lignes et horaires des réseaux de la zone d'étude (GTFS) | ~3 min |

Le détail des tables produites est dans [docs/DONNEES.md](../docs/DONNEES.md).

## Mise en place (une seule fois)

Espace de travail : **HackathonZ**, Lakehouse **`LakeHouseZ`** (schémas activés : tables dans `dbo`).
L'espace « Microsoft x Citiz x Epitech » n'est plus utilisé : sa capacité était saturée et la création de notebooks y était bloquée.

1. **Importer → Notebook → Depuis cet ordinateur**, puis sélectionner les 3 fichiers `.ipynb` de `fabric/notebooks/`.
2. Dans chaque notebook, panneau **Explorer → Add data items → From OneLake catalog** → `LakeHouseZ` (il devient le Lakehouse par défaut).

Les notebooks sont des **notebooks Python** (2 vCores, sans Spark) : ils démarrent en quelques secondes et consomment peu de capacité, ce qui compte car la capacité d'essai est partagée (erreur `TooManyRequestsForCapacity` quand elle est saturée : attendre quelques minutes et relancer).

## Exécution

Ouvrir chaque notebook, ajuster si besoin la cellule de paramètres, puis **Exécuter tout**.

- `03_collecte_gtfs` : le paramètre `ZONE` choisit les réseaux dont on charge les GTFS complets (mots-clés sur la ville, le réseau ou le code INSEE ; `["*"]` = toute la France, plusieurs Go). Par défaut : Bordeaux Métropole et Gironde.
- `02_collecte_gbfs` : chaque exécution **ajoute** une photo de l'état des stations et véhicules aux tables `gbfs_etat_stations` et `gbfs_vehicules`, sans relire ni réécrire l'historique. Pour constituer un historique de disponibilité, planifier le notebook : **Exécuter → Planifier**, toutes les 30 minutes.

Règles de chargement (dernière cellule de chaque notebook) :
- une table produite par l'exécution **remplace** la table Delta ; une photo GBFS est **ajoutée** à l'historique ;
- une table du notebook qui n'a pas été produite est **supprimée**, pour ne jamais publier d'anciennes données. Par exemple, changer `ZONE` vers des réseaux sans `calendar.txt` supprime `gtfs_calendar`, et `AVEC_STOP_TIMES = False` supprime `gtfs_stop_times`. Un historique GBFS sans nouvelle photo reste inchangé ;
- les fichiers téléchargés (agrégat des arrêts, ZIP GTFS) sont réutilisés tant que leur source n'a pas changé : un nouvel export ou un GTFS mis à jour sur le Point d'Accès National est retéléchargé automatiquement (`FORCE = True` force le retéléchargement).

## Résultat dans le Lakehouse

```
LakeHouseZ
├── Files/raw/
│   ├── insee/   fichier ZIP INSEE d'origine
│   ├── gbfs/    réponses JSON brutes de chaque flux GBFS
│   ├── gtfs/    agrégat national des arrêts (CSV) + ZIP GTFS de la zone (+ version de chaque fichier)
│   ├── historique/  une archive Parquet par photo GBFS
│   └── tables/  copies Parquet des tables de la dernière exécution
└── Tables/dbo/  tables Delta, interrogeables en SQL (point de terminaison SQL) et Power BI
```

Les tables sont accessibles depuis n'importe quel notebook de l'espace de travail :

```python
import duckdb  # notebook Python
df = duckdb.sql("SELECT * FROM delta_scan('/lakehouse/default/Tables/dbo/gbfs_stations') WHERE est_citiz").df()

df = spark.read.table("LakeHouseZ.dbo.gbfs_stations")  # notebook PySpark
```

ou en SQL via le point de terminaison SQL du Lakehouse :

```sql
SELECT systeme_nom, COUNT(*) AS stations FROM gbfs_stations WHERE est_citiz = 1 GROUP BY systeme_nom;
```

## Synchroniser Fabric avec GitHub

L'intégration Git native de Fabric n'accepte pas GitHub sur notre tenant (seul Azure DevOps est proposé). Le notebook **`00_synchro_github`** la remplace, dans un seul sens : **le dépôt fait foi**.

1. Fusionner les modifications dans la branche voulue (par défaut `dev`, la branche d'intégration de l'équipe).
2. Dans Fabric, ouvrir `00_synchro_github`, ajuster si besoin `BRANCHE`, puis **Exécuter tout**.
3. Les notebooks présents dans `fabric/notebooks/` (listés dans `manifest.json`, régénéré par `python fabric/build_notebooks.py`) sont mis à jour (ou créés) et rattachés au Lakehouse attaché à `00_synchro_github` (`LakeHouseZ`).

`00_synchro_github` ne contient que ses paramètres et l'appel au script `fabric/synchro_github.py` sur GitHub : il exécute toujours la dernière version du script, mais ne se met jamais à jour lui-même (Fabric interdit à un notebook de réécrire sa propre définition). Pour le recréer : **New item → Notebook** nommé `00_synchro_github`, attacher le Lakehouse, coller ses deux cellules depuis `fabric/notebooks/00_synchro_github.ipynb`.

**Sécurité** : `00_synchro_github` exécute le script de la branche choisie avec les droits Fabric de la personne qui le lance. Il faut donc que seul du code relu arrive sur `dev` : protéger la branche sur GitHub (**Settings → Branches → Add rule** sur `dev` : pull request obligatoire avec au moins une approbation, pas de push forcé). À défaut, épingler une version relue en mettant un identifiant de commit dans `BRANCHE` (ex. `BRANCHE = "2db50c9..."`, le SHA complet) au lieu d'un nom de branche.

Les notebooks qui ne sont pas dans le dépôt (ex. créés par un coéquipier directement dans Fabric) ne sont jamais touchés. En revanche, une modification faite dans Fabric sur un notebook synchronisé est **écrasée** à la synchronisation suivante : il faut modifier le code dans le dépôt. Si un notebook synchronisé est ouvert pendant la synchronisation, Fabric affiche « Another user has saved changes » : cliquer sur **View changes** puis **Keep this version** côté *Saved version*.

### Si le notebook `00_synchro_github` n'existe pas (création bloquée dans Fabric)

La même synchronisation se lance depuis une cellule de **n'importe quel notebook existant**. Ajouter son nom à `EXCLURE` pour qu'il ne s'écrase pas lui-même, puis supprimer la cellule après usage :

```python
DEPOT, BRANCHE, DOSSIER, LAKEHOUSE_PAR_DEFAUT = "meardagoat/hackathon-mobility-citiz", "dev", "fabric/notebooks", "LakeHouseZ"
EXCLURE = "00_synchro_github,NOM_DU_NOTEBOOK_HOTE"
import requests; exec(requests.get(f"https://raw.githubusercontent.com/{DEPOT}/{BRANCHE}/fabric/synchro_github.py").text)
```

## Modifier la collecte

Les notebooks sont **générés** à partir des scripts de `src/ingestion/`. Pour modifier la collecte :

1. modifier le script concerné dans `src/ingestion/` ;
2. le tester en local : `python -m src.ingestion.gbfs` (sortie dans `data/raw/`) ;
3. régénérer les notebooks : `python fabric/build_notebooks.py` ;
4. ouvrir une pull request vers `dev`, puis, une fois fusionnée, lancer `00_synchro_github` dans Fabric.
