"""Génère les notebooks Microsoft Fabric à partir des scripts de src/ingestion/.

Les scripts Python restent la seule source de vérité : après une modification,
relancer `python fabric/build_notebooks.py` puis réimporter les notebooks dans Fabric.
"""
import json
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SRC = RACINE / "src" / "ingestion"
SORTIE = RACINE / "fabric" / "notebooks"

NOTEBOOKS = [
    {
        "fichier": "01_collecte_insee.ipynb",
        "titre": "Collecte INSEE : population au carreau de 200 m (Filosofi 2021)",
        "description": "Télécharge les carreaux INSEE (Métropole, Martinique, Réunion), calcule le centre "
                       "de chaque carreau en lon/lat et charge la table Delta `insee_carreaux_200m`.",
        "module": "insee",
        "pip": "pyproj",
        "parametres": "FORCE = False  # True pour retélécharger le fichier INSEE",
        "appel": "collecter(force=FORCE)",
        "tables": ["insee_carreaux_200m"],
        "historiques": [],
    },
    {
        "fichier": "02_collecte_gbfs.ipynb",
        "titre": "Collecte GBFS : vélos, trottinettes et autopartage (dont Citiz)",
        "description": "Interroge tous les flux GBFS du Point d'Accès National (transport.data.gouv.fr). "
                       "Chaque exécution ajoute une photo de l'état des stations et véhicules : planifier ce "
                       "notebook (ex. toutes les 30 min) construit un historique de disponibilité.",
        "module": "gbfs",
        "pip": None,
        "parametres": ("SEULEMENT_CITIZ = False  # True pour ne collecter que les 15 flux Citiz (rapide)\n"
                       "MANIFESTES = False  # True pour développer Getaround (~3 700 villes, très long)"),
        "appel": "collecter(seulement_citiz=SEULEMENT_CITIZ, manifestes=MANIFESTES)",
        "tables": ["gbfs_flux", "gbfs_stations", "gbfs_types_vehicules"],
        "historiques": ["gbfs_etat_stations", "gbfs_vehicules"],
    },
    {
        "fichier": "03_collecte_gtfs.ipynb",
        "titre": "Collecte GTFS : arrêts, lignes et horaires des transports en commun",
        "description": "Charge le catalogue des GTFS publiés, l'agrégat national de tous les arrêts de France, "
                       "puis les GTFS complets (lignes, courses, horaires) des réseaux de la zone d'étude.",
        "module": "gtfs",
        "pip": None,
        "parametres": ('# Zone d\'étude : Bordeaux Métropole (TBM) + réseaux de Gironde\n'
                       'ZONE = ["Bordeaux Métropole", "Gironde", "Aéroport de Bordeaux"]  # ["*"] = toute la France\n'
                       "EXCLURE_AGREGATS = True  # écarte les agrégats régionaux qui dupliquent les réseaux locaux\n"
                       "AVEC_STOP_TIMES = True  # horaires détaillés (volumineux)\n"
                       "FORCE = False"),
        "appel": "collecter(zone=ZONE, avec_stop_times=AVEC_STOP_TIMES, force=FORCE, exclure_agregats=EXCLURE_AGREGATS)",
        "tables": ["gtfs_catalogue", "gtfs_arrets_france", "gtfs_agency", "gtfs_routes", "gtfs_stops",
                   "gtfs_trips", "gtfs_calendar", "gtfs_calendar_dates", "gtfs_stop_times"],
        "historiques": [],
    },
]

CHARGEMENT_DELTA = '''# Chargement des fichiers Parquet (Files/raw/tables) en tables Delta du Lakehouse par défaut.
# L'écriture passe par l'adresse OneLake (abfss) : le dossier monté /lakehouse/default/Tables
# interrompt les envois de gros fichiers.
from pathlib import Path
import pyarrow.parquet as pq
from deltalake import write_deltalake

try:
    import notebookutils
    ctx = notebookutils.runtime.context
    TABLES_DELTA = (f"abfss://{ctx['defaultLakehouseWorkspaceId']}@onelake.dfs.fabric.microsoft.com/"
                    f"{ctx['defaultLakehouseId']}/Tables" + ("/dbo" if Path("/lakehouse/default/Tables/dbo").exists() else ""))
    OPTIONS = {"bearer_token": notebookutils.credentials.getToken("storage"), "use_fabric_endpoint": "true"}
except ImportError:  # hors Fabric : tables Delta locales, pour tester
    TABLES_DELTA, OPTIONS = str(raw_dir() / "delta"), None

for nom in TABLES:
    source = raw_dir() / "tables" / f"{nom}.parquet"
    if not source.exists():
        print(f"{nom} : absent, ignoré")
        continue
    write_deltalake(f"{TABLES_DELTA}/{nom}", pq.read_table(source), mode="overwrite",
                    schema_mode="overwrite", storage_options=OPTIONS)
    print(f"{nom} : table Delta créée")
'''


def _cellule(type_, source, tags=None):
    cell = {"cell_type": type_, "metadata": {}, "source": source}
    if tags:
        cell["metadata"]["tags"] = tags
    if type_ == "code":
        cell.update(execution_count=None, outputs=[])
    return cell


def _code_module(nom: str) -> str:
    code = (SRC / f"{nom}.py").read_text()
    code = re.sub(r"^from \.common import .*\n", "", code, flags=re.M)
    return code.split('\nif __name__ == "__main__":')[0].rstrip() + "\n"


def construire(nb: dict) -> dict:
    tables = nb["tables"] + nb["historiques"]
    cellules = [
        _cellule("markdown", f"# {nb['titre']}\n\n{nb['description']}\n\n"
                 "**Prérequis** : un Lakehouse attaché comme Lakehouse par défaut du notebook.\n"
                 "Les fichiers bruts sont écrits dans `Files/raw/`, les tables Delta dans `Tables/`.\n\n"
                 "*Notebook généré depuis `src/ingestion/` par `fabric/build_notebooks.py` : "
                 "modifier les scripts, pas ce notebook.*"),
        _cellule("code", nb["parametres"] + "\n", tags=["parameters"]),
    ]
    if nb["pip"]:
        cellules.append(_cellule("code", f"%pip install -q {nb['pip']}\n"))
    cellules += [
        _cellule("markdown", "## Outils communs"),
        _cellule("code", (SRC / "common.py").read_text()),
        _cellule("markdown", "## Collecte"),
        _cellule("code", _code_module(nb["module"])),
        _cellule("code", nb["appel"] + "\n"),
        _cellule("markdown", "## Chargement en tables Delta"),
        _cellule("code", f"TABLES = {tables!r}\n\n" + CHARGEMENT_DELTA),
    ]
    return {
        "cells": cellules,
        "metadata": {  # notebook Python Fabric (sans Spark) : démarre vite et consomme peu de capacité
            "kernel_info": {"name": "jupyter", "jupyter_kernel_name": "python3.12"},
            "kernelspec": {"name": "jupyter", "display_name": "Jupyter"},
            "language_info": {"name": "python"},
            "microsoft": {"language": "python", "language_group": "jupyter_python"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def construire_sync() -> dict:
    """Notebook 00_sync_github : met à jour les notebooks Fabric depuis une branche GitHub."""
    code = (RACINE / "fabric" / "sync_github.py").read_text()
    _, doc, code = code.split('"""', 2)
    return {
        **construire(NOTEBOOKS[0]),
        "cells": [
            _cellule("markdown", "# Synchronisation GitHub → Fabric\n\n" + doc.strip() + "\n\n"
                     "*Notebook généré depuis `fabric/sync_github.py` par `fabric/build_notebooks.py`.*"),
            _cellule("code", 'DEPOT = "meardagoat/hackathon-mobility-citiz"\n'
                             'BRANCHE = "main"  # branche à déployer dans Fabric\n'
                             'DOSSIER = "fabric/notebooks"\n'
                             'EXCLURE = "00_sync_github"  # notebooks à ne pas écraser, séparés par des virgules\n'
                             'LAKEHOUSE_PAR_DEFAUT = "LakeHouseMicrosoft"  # attaché aux notebooks synchronisés\n',
                     tags=["parameters"]),
            _cellule("code", code.lstrip()),
        ],
    }


if __name__ == "__main__":
    SORTIE.mkdir(parents=True, exist_ok=True)
    sorties = [(nb["fichier"], construire(nb)) for nb in NOTEBOOKS] + [("00_sync_github.ipynb", construire_sync())]
    for fichier, contenu in sorties:
        chemin = SORTIE / fichier
        chemin.write_text(json.dumps(contenu, ensure_ascii=False, indent=1))
        print(f"généré : {chemin.relative_to(RACINE)}")
    # Liste des notebooks lue par 00_sync_github pour savoir quoi déployer dans Fabric
    manifeste = {"notebooks": sorted(fichier.removesuffix(".ipynb") for fichier, _ in sorties)}
    (SORTIE / "manifest.json").write_text(json.dumps(manifeste, ensure_ascii=False, indent=1) + "\n")
