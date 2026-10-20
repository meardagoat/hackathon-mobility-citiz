"""Outils communs à la collecte : chemins, téléchargements HTTP, écriture des tables.

Les mêmes scripts tournent en local (sortie dans data/raw/) et dans un notebook
Microsoft Fabric (sortie dans le Lakehouse attaché : /lakehouse/default/Files/raw/).
"""
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests

FABRIC_LAKEHOUSE = Path("/lakehouse/default/Files/raw")
LOCAL_RAW = Path(__file__).resolve().parents[2] / "data" / "raw" if "__file__" in globals() else Path("data/raw")

USER_AGENT = "hackathon-mobility-citiz/1.0 (collecte open data)"
PAN_API = "https://transport.data.gouv.fr/api/datasets"


def raw_dir() -> Path:
    """Dossier racine des données brutes : Lakehouse Fabric si présent, sinon data/raw/."""
    base = Path(os.environ["RAW_DIR"]) if "RAW_DIR" in os.environ else (
        FABRIC_LAKEHOUSE if FABRIC_LAKEHOUSE.parent.exists() else LOCAL_RAW
    )
    base.mkdir(parents=True, exist_ok=True)
    return base


def tables_dir() -> Path:
    """Tables Parquet prêtes à être chargées en tables Delta dans Fabric."""
    d = raw_dir() / "tables"
    d.mkdir(parents=True, exist_ok=True)
    return d


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def http_get(url: str, timeout: int = 60, retries: int = 3, **kwargs) -> requests.Response:
    headers = {"User-Agent": USER_AGENT, **kwargs.pop("headers", {})}
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=headers, timeout=timeout, **kwargs)
            r.raise_for_status()
            return r
        except requests.RequestException:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)


def get_json(url: str, timeout: int = 30):
    return http_get(url, timeout=timeout).json()


def download(url: str, dest: Path, force: bool = False, version: str | None = None) -> Path:
    """Télécharge un fichier en streaming. Ne retélécharge pas s'il existe déjà, sauf si
    `version` (date de mise à jour, empreinte…) diffère de celle du fichier en cache."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    fichier_version = dest.with_name(dest.name + ".version")
    en_cache = fichier_version.read_text() if fichier_version.exists() else None
    if dest.exists() and dest.stat().st_size > 0 and not force and (version is None or version == en_cache):
        print(f"  déjà présent : {dest.name}")
        return dest
    tmp = dest.with_suffix(dest.suffix + ".part")
    with http_get(url, timeout=300, stream=True) as r, open(tmp, "wb") as f:
        for chunk in r.iter_content(chunk_size=1 << 20):
            f.write(chunk)
    tmp.rename(dest)
    if version is not None:
        fichier_version.write_text(version)
    elif fichier_version.exists():
        fichier_version.unlink()
    print(f"  téléchargé : {dest.name} ({dest.stat().st_size / 1e6:.1f} Mo)")
    return dest


def save_json(obj, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(obj, ensure_ascii=False))


def _manquant(v) -> bool:
    """Valeur manquante (None, NaN, pd.NA), sans échouer sur les listes ou dictionnaires des flux JSON."""
    return v is None or v is pd.NA or (isinstance(v, float) and v != v)


def _types_homogenes(df: pd.DataFrame) -> pd.DataFrame:
    """Les flux open data mélangent parfois nombres et textes dans une même colonne :
    on convertit ces colonnes en texte pour que Parquet / Delta les acceptent.
    Les colonnes booléennes avec des valeurs manquantes restent booléennes (type nullable)."""
    for col in df.columns[df.dtypes == object]:
        valeurs = df[col].dropna()
        types = {type(v) for v in valeurs}
        if not types:  # colonne entièrement vide : type "null" refusé par Delta, on la type en texte
            df[col] = df[col].astype("string")
        elif types & {bool, np.bool_} and types <= {bool, np.bool_, str} and valeurs.map(
                lambda v: str(v).lower() in ("true", "false")).all():
            # booléens avec des trous (ou déjà écrits en texte "True"/"False" dans l'historique)
            df[col] = df[col].map(lambda v: None if _manquant(v) else str(v).lower() == "true").astype("boolean")
        elif all(issubclass(t, (int, float, np.integer, np.floating)) and not issubclass(t, (bool, np.bool_))
                 for t in types):  # entiers et décimaux mélangés : nombre décimal
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("float64")
        elif len(types) > 1 or types - {str}:
            df[col] = df[col].map(lambda v: None if _manquant(v) else str(v))
    return df


# Tables écrites pendant l'exécution en cours : le notebook Fabric ne publie que celles-ci.
TABLES_ECRITES: list[str] = []


def write_table(df: pd.DataFrame, name: str, historique: bool = False) -> Path:
    """Écrit une table Parquet dans <raw>/tables/<name>.parquet.

    historique=True : la table ne contient que la photo de cette exécution ; elle est aussi
    archivée dans <raw>/historique/<name>/<date_collecte>.parquet, sans relire les photos
    précédentes (le notebook Fabric l'ajoute à la table Delta au lieu de la réécrire)."""
    path = tables_dir() / f"{name}.parquet"
    if df.empty and not historique and path.exists():  # collecte vide : on garde les dernières données valides
        print(f"  table {name} : aucune ligne collectée, version précédente conservée")
        if name not in TABLES_ECRITES:
            TABLES_ECRITES.append(name)
        return path
    df = _types_homogenes(df.copy())  # ne modifie pas le DataFrame de l'appelant
    df.to_parquet(path, index=False)
    if historique:
        archive = raw_dir() / "historique" / name / f"{datetime.now(timezone.utc):%Y%m%dT%H%M%S%fZ}.parquet"
        archive.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(archive, index=False)
    if name not in TABLES_ECRITES:
        TABLES_ECRITES.append(name)
    print(f"  table {name} : {len(df):,} lignes -> {path}")
    return path


def reprendre_precedent(df: pd.DataFrame, name: str, ids_echec, cle: str = "ressource_id"):
    """Ajoute à df les lignes de la version précédente de la table pour les sources en échec :
    une panne passagère d'un flux ne fait pas disparaître ses dernières données valides.
    Ces lignes gardent leur date_collecte d'origine. Renvoie (table, identifiants repris)."""
    path = tables_dir() / f"{name}.parquet"
    ids = {str(i) for i in ids_echec}
    if not ids or not path.exists():
        return df, set()
    precedent = pd.read_parquet(path)
    if cle not in precedent:
        return df, set()
    precedent = precedent[precedent[cle].astype(str).isin(ids)]
    if precedent.empty:
        return df, set()
    print(f"  {name} : {len(precedent):,} lignes précédentes conservées pour {precedent[cle].nunique()} source(s) en échec")
    return pd.concat([df, precedent], ignore_index=True) if len(df.columns) else precedent, set(precedent[cle].astype(str))


def pan_catalog() -> list:
    """Catalogue complet du Point d'Accès National transport.data.gouv.fr."""
    return get_json(PAN_API, timeout=120)
