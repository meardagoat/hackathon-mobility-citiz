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
        "tables": ["gtfs_catalogue", "gtfs_arrets_france", "gtfs_ressources", "gtfs_agency", "gtfs_routes", "gtfs_stops",
                   "gtfs_trips", "gtfs_calendar", "gtfs_calendar_dates", "gtfs_stop_times"],
        "historiques": [],
    },
]

CHARGEMENT_DELTA = '''# Chargement en tables Delta du Lakehouse par défaut, à partir des Parquet écrits par CETTE exécution :
# - table produite : remplacée ; pour un historique, la photo est ajoutée à la suite (sans relire l'existant) ;
# - table non produite (ex. ZONE modifiée, AVEC_STOP_TIMES=False) : supprimée, pour ne jamais publier
#   d'anciennes données ; un historique sans nouvelle photo reste inchangé.
# L'écriture passe par l'adresse OneLake (abfss) : le dossier monté /lakehouse/default/Tables
# interrompt les envois de gros fichiers.
import shutil
from pathlib import Path
import pyarrow.parquet as pq
from deltalake import DeltaTable, Schema, write_deltalake

if not TABLES_ECRITES:
    raise RuntimeError("Aucune table produite dans cette session : exécuter d'abord la cellule de collecte.")

try:
    import notebookutils
    ctx = notebookutils.runtime.context
    TABLES_DELTA = (f"abfss://{ctx['defaultLakehouseWorkspaceId']}@onelake.dfs.fabric.microsoft.com/"
                    f"{ctx['defaultLakehouseId']}/Tables" + ("/dbo" if Path("/lakehouse/default/Tables/dbo").exists() else ""))
    OPTIONS = {"bearer_token": notebookutils.credentials.getToken("storage"), "use_fabric_endpoint": "true"}

    def supprimer(chemin):
        if notebookutils.fs.exists(chemin):
            notebookutils.fs.rm(chemin, True)
except ImportError:  # hors Fabric : tables Delta locales, pour tester
    TABLES_DELTA, OPTIONS = str(raw_dir() / "delta"), None

    def supprimer(chemin):
        shutil.rmtree(chemin, ignore_errors=True)

for nom in TABLES + HISTORIQUES:
    cible, source = f"{TABLES_DELTA}/{nom}", raw_dir() / "tables" / f"{nom}.parquet"
    if nom not in TABLES_ECRITES:
        if nom in HISTORIQUES:
            print(f"{nom} : pas de nouvelle photo, historique inchangé")
        else:
            supprimer(cible)
            source.unlink(missing_ok=True)
            print(f"{nom} : non produite par cette exécution, table supprimée")
        continue
    donnees = pq.read_table(source)
    if nom not in HISTORIQUES:
        write_deltalake(cible, donnees, mode="overwrite", schema_mode="overwrite", storage_options=OPTIONS)
        print(f"{nom} : table Delta remplacée ({donnees.num_rows:,} lignes)")
        continue
    # une colonne dont le type change (ex. booléens écrits en texte par une version précédente)
    # serait convertie silencieusement : on réécrit alors l'historique une fois, avec les bons types
    if DeltaTable.is_deltatable(cible, storage_options=OPTIONS):
        existant = {f.name: str(f.type) for f in DeltaTable(cible, storage_options=OPTIONS).schema().fields}
        nouveau = {f.name: str(f.type) for f in (Schema.from_arrow(donnees.schema) if hasattr(Schema, "from_arrow")
                                                 else Schema.from_pyarrow(donnees.schema)).fields}
        conflits = [c for c in nouveau if c in existant and existant[c] != nouveau[c]]
    else:
        conflits = []
    if conflits:
        print(f"{nom} : types modifiés ({', '.join(conflits)}), réécriture unique de l'historique")
        ancien = DeltaTable(cible, storage_options=OPTIONS).to_pandas()
        tout = _types_homogenes(pd.concat([ancien.astype({c: object for c in conflits}), donnees.to_pandas()],
                                          ignore_index=True))
        write_deltalake(cible, tout, mode="overwrite", schema_mode="overwrite", storage_options=OPTIONS)
    else:
        write_deltalake(cible, donnees, mode="append", schema_mode="merge", storage_options=OPTIONS)
    print(f"{nom} : {donnees.num_rows:,} lignes ajoutées à l'historique")
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
        _cellule("code", f"TABLES = {nb['tables']!r}\nHISTORIQUES = {nb['historiques']!r}\n\n" + CHARGEMENT_DELTA),
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
    """Notebook 00_synchro_github : met à jour les notebooks Fabric depuis une branche GitHub.

    Il ne contient que les paramètres et le chargement de fabric/synchro_github.py depuis GitHub :
    Fabric interdit à un notebook de réécrire sa propre définition, il ne peut donc pas se mettre
    à jour lui-même, mais il exécute toujours la dernière version du script."""
    code = (RACINE / "fabric" / "synchro_github.py").read_text()
    _, doc, _ = code.split('"""', 2)
    return {
        **construire(NOTEBOOKS[0]),
        "cells": [
            _cellule("markdown", "# Synchronisation GitHub → Fabric\n\n" + doc.strip() + "\n\n"
                     "Ce notebook exécute la dernière version de `fabric/synchro_github.py` sur la branche choisie. "
                     "Il ne se met jamais à jour lui-même (Fabric l'interdit) : il est exclu de la synchronisation."),
            _cellule("code", 'DEPOT = "meardagoat/hackathon-mobility-citiz"\n'
                             'BRANCHE = "dev"  # branche à déployer dans Fabric (dev = intégration)\n'
                             'DOSSIER = "fabric/notebooks"\n'
                             'EXCLURE = "00_synchro_github"  # notebooks à ne pas écraser, séparés par des virgules\n'
                             'LAKEHOUSE_PAR_DEFAUT = "LakeHouseZ"  # si le notebook n\'a pas de Lakehouse attaché\n',
                     tags=["parameters"]),
            _cellule("code", 'import requests\n'
                             'exec(requests.get(f"https://raw.githubusercontent.com/{DEPOT}/{BRANCHE}/fabric/synchro_github.py", timeout=30).text)\n'),
        ],
    }

if __name__ == "__main__":
    SORTIE.mkdir(parents=True, exist_ok=True)
    sorties = [(nb["fichier"], construire(nb)) for nb in NOTEBOOKS] + [("00_synchro_github.ipynb", construire_sync())]
    for fichier, contenu in sorties:
        chemin = SORTIE / fichier
        chemin.write_text(json.dumps(contenu, ensure_ascii=False, indent=1))
        print(f"généré : {chemin.relative_to(RACINE)}")
    # Liste des notebooks lue par 00_synchro_github pour savoir quoi déployer dans Fabric
    # (tous les .ipynb du dossier : générés ici ou déposés par l'équipe)
    manifeste = {"notebooks": sorted(p.stem for p in SORTIE.glob("*.ipynb"))}
    (SORTIE / "manifest.json").write_text(json.dumps(manifeste, ensure_ascii=False, indent=1) + "\n")
