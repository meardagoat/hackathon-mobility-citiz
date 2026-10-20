"""Collecte GTFS : arrêts, lignes et horaires des transports en commun.

Sources :
  - Catalogue du Point d'Accès National : https://transport.data.gouv.fr/datasets?type=public-transit
  - Agrégat national des arrêts : https://www.data.gouv.fr/datasets/arrets-de-transport-en-france

Trois niveaux de collecte :
  1. le catalogue de tous les GTFS publiés (léger) ;
  2. tous les arrêts de France en un seul fichier (environ 440 Mo, non dédoublonné) ;
  3. les GTFS complets (lignes, courses, horaires) des réseaux de la zone d'étude.

Sorties :
  <raw>/gtfs/arrets_france.csv
  <raw>/gtfs/zips/<jeu>_<ressource>.zip
  <raw>/tables/gtfs_catalogue.parquet
  <raw>/tables/gtfs_arrets_france.parquet
  <raw>/tables/gtfs_<fichier>.parquet   (agency, routes, stops, trips, calendar, calendar_dates, stop_times)
"""
import zipfile

import pandas as pd

from .common import download, get_json, now_utc, pan_catalog, raw_dir, write_table

ARRETS_FRANCE_DATASET = "https://www.data.gouv.fr/api/1/datasets/arrets-de-transport-en-france/"
# Zone d'étude retenue : Bordeaux Métropole (TBM) + réseaux de Gironde pour le périurbain
ZONE_BORDEAUX = ["Bordeaux Métropole", "Gironde", "Aéroport de Bordeaux"]
FICHIERS_GTFS = ["agency", "routes", "stops", "trips", "calendar", "calendar_dates", "stop_times"]


def catalogue() -> pd.DataFrame:
    rows = []
    for ds in pan_catalog():
        if ds.get("type") != "public-transit":
            continue
        zones = ds.get("covered_area") or []
        for r in ds.get("resources", []):
            if r.get("format") != "GTFS":
                continue
            meta = r.get("metadata") or {}
            rows.append({
                "jeu_id": ds["id"],
                "jeu_slug": ds["slug"],
                "jeu_titre": ds["title"],
                "producteur": (ds.get("publisher") or {}).get("name"),
                "zones_couvertes": " | ".join(z.get("nom", "") for z in zones),
                "zones_insee": " | ".join(str(z.get("insee", "")) for z in zones),
                "types_zones": " | ".join(z.get("type", "") for z in zones),
                "ressource_id": r.get("id"),
                "ressource_titre": r.get("title"),
                "modes": ",".join(meta.get("modes") or []),
                "reseaux": ",".join(meta.get("networks") or []),
                "date_fin_validite": meta.get("end_date"),
                "disponible": r.get("is_available"),
                "url": r.get("url"),
                "page_pan": ds.get("page_url"),
            })
    df = pd.DataFrame(rows)
    df["date_collecte"] = now_utc()
    write_table(df, "gtfs_catalogue")
    return df


def arrets_france(force: bool = False) -> pd.DataFrame:
    """Agrégat national de tous les arrêts GTFS (dernière version publiée sur data.gouv.fr)."""
    meta = get_json(ARRETS_FRANCE_DATASET)
    ressource = next(r for r in meta["resources"] if r["format"] == "csv")
    print(f"  agrégat national : {ressource['title']}")
    chemin = download(ressource["url"], raw_dir() / "gtfs" / "arrets_france.csv", force=force)
    df = pd.read_csv(chemin, dtype=str, low_memory=False)
    for col in ("stop_lat", "stop_lon"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["fichier_source"] = ressource["title"]
    df["date_collecte"] = now_utc()
    write_table(df, "gtfs_arrets_france")
    return df


def selectionner(cat: pd.DataFrame, zone: list[str], exclure_agregats: bool = True) -> pd.DataFrame:
    """Filtre le catalogue sur des mots-clés (nom de zone, de réseau, titre ou code INSEE).
    zone = ["*"] sélectionne tous les GTFS de France.
    exclure_agregats : écarte les agrégats régionaux, qui dupliquent les réseaux locaux."""
    cat = cat[cat["disponible"].fillna(False)]
    if zone == ["*"]:
        return cat
    if exclure_agregats:
        cat = cat[~cat["jeu_titre"].str.lower().str.startswith("agrégat")]
    texte = (cat["jeu_titre"] + " " + cat["zones_couvertes"] + " " + cat["zones_insee"] + " "
             + cat["reseaux"] + " " + cat["producteur"].fillna("")).str.lower()
    masque = pd.Series(False, index=cat.index)
    for mot in zone:
        masque |= texte.str.contains(mot.lower(), regex=False)
    return cat[masque]


def gtfs_complets(cat: pd.DataFrame, zone: list[str], avec_stop_times: bool = True, force: bool = False,
                  exclure_agregats: bool = True) -> None:
    choix = selectionner(cat, zone, exclure_agregats)
    print(f"  {len(choix)} GTFS sélectionnés pour la zone {zone}")
    fichiers = FICHIERS_GTFS if avec_stop_times else [f for f in FICHIERS_GTFS if f != "stop_times"]
    morceaux = {f: [] for f in fichiers}
    for r in choix.to_dict("records"):
        zip_path = raw_dir() / "gtfs" / "zips" / f"{r['jeu_slug']}_{r['ressource_id']}.zip"
        try:
            download(r["url"], zip_path, force=force)
            with zipfile.ZipFile(zip_path) as z:
                noms = {n.split("/")[-1]: n for n in z.namelist()}
                for f in fichiers:
                    if f"{f}.txt" in noms:
                        with z.open(noms[f"{f}.txt"]) as fh:
                            df = pd.read_csv(fh, dtype=str, encoding="utf-8-sig")
                        df.insert(0, "ressource_id", str(r["ressource_id"]))
                        df.insert(1, "jeu_titre", r["jeu_titre"])
                        morceaux[f].append(df)
        except Exception as e:
            print(f"  ! {r['jeu_titre']} ({r['ressource_id']}) ignoré : {e}")
    horodatage = now_utc()
    for f, dfs in morceaux.items():
        if dfs:
            df = pd.concat(dfs, ignore_index=True).assign(date_collecte=horodatage)
            for col in ("stop_lat", "stop_lon"):
                if col in df:
                    df[col] = pd.to_numeric(df[col], errors="coerce")
            write_table(df, f"gtfs_{f}")


def collecter(zone: list[str], avec_stop_times: bool = True, force: bool = False,
              exclure_agregats: bool = True) -> None:
    print("GTFS - transports en commun")
    cat = catalogue()
    arrets_france(force=force)
    gtfs_complets(cat, zone, avec_stop_times=avec_stop_times, force=force, exclure_agregats=exclure_agregats)


if __name__ == "__main__":
    import sys
    collecter(zone=sys.argv[1:] or ZONE_BORDEAUX)
