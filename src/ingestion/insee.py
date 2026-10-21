"""Collecte INSEE : population et revenus au carreau de 200 m (Filosofi 2021).

Source : https://www.insee.fr/fr/statistiques/8735162
Couverture : France métropolitaine, Martinique, La Réunion.

Sorties :
  <raw>/insee/Filosofi2021_carreaux_200m_csv.zip   (fichier brut INSEE)
  <raw>/tables/insee_carreaux_200m.parquet        (une ligne par carreau habité)
"""
import re
import zipfile

import pandas as pd

from .common import download, now_utc, raw_dir, write_table

FILOSOFI_URL = "https://www.insee.fr/fr/statistiques/fichier/8735162/Filosofi2021_carreaux_200m_csv.zip"
TERRITOIRES = {"met": "Métropole", "mart": "Martinique", "reun": "La Réunion"}
ID_PATTERN = re.compile(r"CRS(\d+)RES200mN(\d+)E(\d+)")


def _ajouter_coordonnees(df: pd.DataFrame) -> pd.DataFrame:
    """Déduit la projection et le centre du carreau à partir de son identifiant INSEE.

    L'identifiant code le coin sud-ouest du carreau (ex. CRS3035RES200mN2029400E4259000) ;
    le centre est donc à +100 m sur chaque axe.
    """
    parts = df["idcar_200m"].str.extract(ID_PATTERN)
    df["epsg"] = parts[0].astype(int)
    df["x_centre"] = parts[2].astype(float) + 100
    df["y_centre"] = parts[1].astype(float) + 100
    try:
        from pyproj import Transformer
    except ImportError:
        print("  pyproj absent : lon/lat non calculées (x_centre / y_centre restent disponibles)")
        return df
    df["lon"], df["lat"] = float("nan"), float("nan")
    for epsg, idx in df.groupby("epsg").groups.items():
        t = Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)
        lon, lat = t.transform(df.loc[idx, "x_centre"].values, df.loc[idx, "y_centre"].values)
        df.loc[idx, "lon"], df.loc[idx, "lat"] = lon, lat
    return df


def collecter(force: bool = False) -> pd.DataFrame:
    print("INSEE Filosofi 2021 - carreaux 200 m")
    zip_path = download(FILOSOFI_URL, raw_dir() / "insee" / "Filosofi2021_carreaux_200m_csv.zip", force=force)

    frames = []
    with zipfile.ZipFile(zip_path) as z:
        for name in z.namelist():
            code = name.removeprefix("carreaux_200m_").removesuffix(".csv")
            with z.open(name) as f:
                df = pd.read_csv(f, dtype={"idcar_200m": str, "idcar_1km": str, "idcar_nat": str, "lcog_geo": str})
            df.insert(0, "territoire", TERRITOIRES.get(code, code))
            frames.append(df)
            print(f"  {name} : {len(df):,} carreaux")

    df = _ajouter_coordonnees(pd.concat(frames, ignore_index=True))
    df["source"] = "INSEE Filosofi 2021"
    df["date_collecte"] = now_utc()
    write_table(df, "insee_carreaux_200m")
    return df


if __name__ == "__main__":
    collecter()
