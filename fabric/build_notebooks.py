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
        "parametres": ('ZONE = ["Strasbourg"]  # mots-clés : ville, réseau, code INSEE... ["*"] = toute la France\n'
                       "AVEC_STOP_TIMES = True  # horaires détaillés (volumineux)\n"
                       "FORCE = False"),
        "appel": "collecter(zone=ZONE, avec_stop_times=AVEC_STOP_TIMES, force=FORCE)",
        "tables": ["gtfs_catalogue", "gtfs_arrets_france", "gtfs_agency", "gtfs_routes", "gtfs_stops",
                   "gtfs_trips", "gtfs_calendar", "gtfs_calendar_dates", "gtfs_stop_times"],
        "historiques": [],
    },
]

CHARGEMENT_DELTA = '''# Chargement des fichiers Parquet (Files/raw/tables) en tables Delta du Lakehouse
from notebookutils import mssparkutils

def charger(nom):
    chemin = f"Files/raw/tables/{nom}.parquet"
    if not mssparkutils.fs.exists(chemin):
        print(f"{nom} : absent, ignoré")
        return
    df = spark.read.parquet(chemin)
    df.write.mode("overwrite").option("overwriteSchema", "true").format("delta").saveAsTable(nom)
    print(f"{nom} : {df.count():,} lignes")

for nom in TABLES:
    charger(nom)
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
        "metadata": {
            "kernel_info": {"name": "synapse_pyspark"},
            "kernelspec": {"name": "synapse_pyspark", "display_name": "Synapse PySpark"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


if __name__ == "__main__":
    SORTIE.mkdir(parents=True, exist_ok=True)
    for nb in NOTEBOOKS:
        chemin = SORTIE / nb["fichier"]
        chemin.write_text(json.dumps(construire(nb), ensure_ascii=False, indent=1))
        print(f"généré : {chemin.relative_to(RACINE)}")
