"""Outils communs à la collecte : chemins, téléchargements HTTP, écriture des tables.

Les mêmes scripts tournent en local (sortie dans data/raw/) et dans un notebook
Microsoft Fabric (sortie dans le Lakehouse attaché : /lakehouse/default/Files/raw/).
"""
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

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


def download(url: str, dest: Path, force: bool = False) -> Path:
    """Télécharge un fichier en streaming. Ne retélécharge pas s'il existe déjà."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0 and not force:
        print(f"  déjà présent : {dest.name}")
        return dest
    tmp = dest.with_suffix(dest.suffix + ".part")
    with http_get(url, timeout=300, stream=True) as r, open(tmp, "wb") as f:
        for chunk in r.iter_content(chunk_size=1 << 20):
            f.write(chunk)
    tmp.rename(dest)
    print(f"  téléchargé : {dest.name} ({dest.stat().st_size / 1e6:.1f} Mo)")
    return dest


def save_json(obj, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(obj, ensure_ascii=False))


def _types_homogenes(df: pd.DataFrame) -> pd.DataFrame:
    """Les flux open data mélangent parfois nombres et textes dans une même colonne :
    on convertit ces colonnes en texte pour que Parquet / Delta les acceptent."""
    for col in df.columns[df.dtypes == object]:
        types = {type(v) for v in df[col].dropna()}
        if len(types) > 1 or types - {str}:
            df[col] = df[col].map(lambda v: None if v is None or v != v else str(v))
    return df


def write_table(df: pd.DataFrame, name: str, append: bool = False) -> Path:
    """Écrit une table Parquet dans <raw>/tables/<name>.parquet (ou ajoute à l'existante)."""
    path = tables_dir() / f"{name}.parquet"
    df = _types_homogenes(df)
    if append and path.exists():
        df = _types_homogenes(pd.concat([pd.read_parquet(path), df], ignore_index=True))
    df.to_parquet(path, index=False)
    print(f"  table {name} : {len(df):,} lignes -> {path}")
    return path


def pan_catalog() -> list:
    """Catalogue complet du Point d'Accès National transport.data.gouv.fr."""
    return get_json(PAN_API, timeout=120)
