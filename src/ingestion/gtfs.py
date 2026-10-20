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
  <raw>/tables/gtfs_ressources.parquet  (statut de lecture de chaque GTFS de la zone)
  <raw>/tables/gtfs_<fichier>.parquet   (agency, routes, stops, trips, calendar, calendar_dates, stop_times)
"""
import zipfile

import pandas as pd

from .common import download, get_json, now_utc, pan_catalog, raw_dir, reprendre_precedent, write_table

ARRETS_FRANCE_DATASET = "https://www.data.gouv.fr/api/1/datasets/arrets-de-transport-en-france/"
# Zone d'étude retenue : Bordeaux Métropole (TBM) + réseaux de Gironde pour le périurbain
ZONE_BORDEAUX = ["Bordeaux Métropole", "Gironde", "Aéroport de Bordeaux"]
FICHIERS_GTFS = ["agency", "routes", "stops", "trips", "calendar", "calendar_dates", "stop_times"]
# Sans ces fichiers, un réseau publierait des arrêts sans lignes ni courses : il est traité comme un échec.
FICHIERS_REQUIS = ["routes", "stops", "trips", "stop_times"]


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
                "licence": ds.get("licence"),
                "zones_couvertes": " | ".join(z.get("nom", "") for z in zones),
                "zones_insee": " | ".join(str(z.get("insee", "")) for z in zones),
                "types_zones": " | ".join(z.get("type", "") for z in zones),
                "ressource_id": r.get("id"),
                "ressource_titre": r.get("title"),
                "modes": ",".join(meta.get("modes") or []),
                "reseaux": ",".join(meta.get("networks") or []),
                "date_fin_validite": meta.get("end_date"),
                "disponible": r.get("is_available"),
                "mise_a_jour": r.get("updated"),
                "url": r.get("url"),
                "page_pan": ds.get("page_url"),
            })
    df = pd.DataFrame(rows)
    df["date_collecte"] = now_utc()
    write_table(df, "gtfs_catalogue")
    return df


def arrets_france(force: bool = False, cat: pd.DataFrame | None = None) -> pd.DataFrame:
    """Agrégat national de tous les arrêts GTFS (dernière version publiée sur data.gouv.fr).
    cat : catalogue GTFS, pour indiquer la licence du réseau d'origine de chaque arrêt."""
    meta = get_json(ARRETS_FRANCE_DATASET)
    ressource = next(r for r in meta["resources"] if r["format"] == "csv")
    print(f"  agrégat national : {ressource['title']}")
    # empreinte publiée par data.gouv.fr : un nouvel export remplace le fichier en cache
    version = (ressource.get("checksum") or {}).get("value") or ressource.get("last_modified")
    chemin = download(ressource["url"], raw_dir() / "gtfs" / "arrets_france.csv", force=force, version=version)
    df = pd.read_csv(chemin, dtype=str, low_memory=False)
    for col in ("stop_lat", "stop_lon"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["fichier_source"] = ressource["title"]
    if cat is not None:  # licence propre à chaque réseau (Licence Ouverte, ODbL…), absente si le GTFS a été retiré
        licences = dict(zip(cat["ressource_id"].astype(str), cat["licence"]))
        df["licence_reseau"] = df["resource_id"].map(licences)
    df["date_collecte"] = now_utc()
    write_table(df, "gtfs_arrets_france")
    return df


def selectionner(cat: pd.DataFrame, zone: list[str], exclure_agregats: bool = True,
                 seulement_disponibles: bool = True) -> pd.DataFrame:
    """Filtre le catalogue sur des mots-clés (nom de zone, de réseau, titre ou code INSEE).
    zone = ["*"] sélectionne tous les GTFS de France.
    exclure_agregats : écarte les agrégats régionaux, qui dupliquent les réseaux locaux.
    seulement_disponibles=False : garde aussi les GTFS de la zone signalés indisponibles."""
    if seulement_disponibles:
        cat = cat[cat["disponible"].astype("boolean").fillna(False).astype(bool)]
    if exclure_agregats:
        cat = cat[~cat["jeu_titre"].str.lower().str.startswith("agrégat")]
    if zone == ["*"]:
        return cat
    texte = (cat["jeu_titre"] + " " + cat["zones_couvertes"] + " " + cat["zones_insee"] + " "
             + cat["reseaux"] + " " + cat["producteur"].fillna("")).str.lower()
    masque = pd.Series(False, index=cat.index)
    for mot in zone:
        masque |= texte.str.contains(mot.lower(), regex=False)
    return cat[masque]


def gtfs_complets(cat: pd.DataFrame, zone: list[str], avec_stop_times: bool = True, force: bool = False,
                  exclure_agregats: bool = True) -> None:
    zone_complete = selectionner(cat, zone, exclure_agregats, seulement_disponibles=False)
    disponible = zone_complete["disponible"].astype("boolean").fillna(False).astype(bool)
    choix, indisponibles = zone_complete[disponible], zone_complete[~disponible]
    print(f"  {len(choix)} GTFS sélectionnés pour la zone {zone} ({len(indisponibles)} indisponibles)")
    if zone_complete.empty:  # sinon toutes les tables de la zone seraient supprimées au chargement
        raise ValueError(f"Aucun GTFS ne correspond à la zone {zone} : vérifier le paramètre ZONE")
    fichiers = FICHIERS_GTFS if avec_stop_times else [f for f in FICHIERS_GTFS if f != "stop_times"]
    requis = [f for f in FICHIERS_REQUIS if f in fichiers]
    morceaux = {f: [] for f in fichiers}
    statuts = []
    for r in choix.to_dict("records"):
        zip_path = raw_dir() / "gtfs" / "zips" / f"{r['jeu_slug']}_{r['ressource_id']}.zip"
        lus = {}
        try:
            download(r["url"], zip_path, force=force, version=r.get("mise_a_jour"))
            with zipfile.ZipFile(zip_path) as z:
                noms = {n.split("/")[-1]: n for n in z.namelist()}
                for f in fichiers:
                    if f"{f}.txt" in noms:
                        with z.open(noms[f"{f}.txt"]) as fh:
                            df = pd.read_csv(fh, dtype=str, encoding="utf-8-sig")
                        df.insert(0, "ressource_id", str(r["ressource_id"]))
                        df.insert(1, "jeu_titre", r["jeu_titre"])
                        lus[f] = df
            manquants = [f"{f}.txt" for f in requis if f not in lus]
            if manquants:
                raise ValueError(f"fichiers absents : {', '.join(manquants)}")
            statut = "ok"
        except Exception as e:
            print(f"  ! {r['jeu_titre']} ({r['ressource_id']}) ignoré : {e}")
            statut, lus = f"erreur: {e}", {}
        # une ressource n'est publiée que si tous ses fichiers ont été lus : pas d'arrêts sans courses
        for f, df in lus.items():
            morceaux[f].append(df)
        statuts.append({"ressource_id": str(r["ressource_id"]), "jeu_titre": r["jeu_titre"], "url": r["url"],
                        "licence": r.get("licence"), "mise_a_jour": r.get("mise_a_jour"), "statut": statut, "fichiers": ",".join(lus),
                        "nb_arrets": len(lus["stops"]) if "stops" in lus else None})
    # GTFS de la zone signalé indisponible sur le PAN : traité comme un échec (données précédentes conservées)
    for r in indisponibles.to_dict("records"):
        statuts.append({"ressource_id": str(r["ressource_id"]), "jeu_titre": r["jeu_titre"], "url": r["url"],
                        "licence": r.get("licence"), "mise_a_jour": r.get("mise_a_jour"),
                        "statut": "indisponible sur le Point d'Accès National", "fichiers": "", "nb_arrets": None})
    horodatage = now_utc()
    # un GTFS illisible ou indisponible garde ses données de la collecte précédente au lieu de disparaître des tables
    echecs, repris = [st["ressource_id"] for st in statuts if st["statut"] != "ok"], set()
    for f, dfs in morceaux.items():
        df = pd.concat(dfs, ignore_index=True).assign(date_collecte=horodatage) if dfs else pd.DataFrame()
        df, ids = reprendre_precedent(df, f"gtfs_{f}", echecs)
        repris |= ids
        if dfs or len(df):  # fichier lu (même vide) ou repris ; un fichier absent partout n'est pas écrit
            for col in ("stop_lat", "stop_lon"):
                if col in df:
                    df[col] = pd.to_numeric(df[col], errors="coerce")
            write_table(df, f"gtfs_{f}")
    colonnes = ["ressource_id", "jeu_titre", "url", "licence", "mise_a_jour", "statut", "fichiers", "nb_arrets"]
    ressources = pd.DataFrame(statuts, columns=colonnes)
    ressources["donnees_precedentes"] = ressources["ressource_id"].isin(repris)
    write_table(ressources.assign(date_collecte=horodatage), "gtfs_ressources")


def collecter(zone: list[str], avec_stop_times: bool = True, force: bool = False,
              exclure_agregats: bool = True) -> None:
    print("GTFS - transports en commun")
    cat = catalogue()
    arrets_france(force=force, cat=cat)
    gtfs_complets(cat, zone, avec_stop_times=avec_stop_times, force=force, exclure_agregats=exclure_agregats)


if __name__ == "__main__":
    import sys
    collecter(zone=sys.argv[1:] or ZONE_BORDEAUX)
