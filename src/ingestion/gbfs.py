"""Collecte GBFS : stations et véhicules partagés (vélos, trottinettes, autopartage dont Citiz).

Source : catalogue du Point d'Accès National, jeux "vehicles-sharing"
https://transport.data.gouv.fr/datasets?type=vehicles-sharing

Gère les versions GBFS 1.x, 2.x et 3.0. Chaque exécution prend une photo de l'état
des stations et véhicules : relancée régulièrement, elle constitue un historique.

Sorties :
  <raw>/gbfs/<jeu>/<flux>.json              (réponses brutes de chaque flux)
  <raw>/tables/gbfs_flux.parquet           (catalogue des flux et statut de collecte)
  <raw>/tables/gbfs_stations.parquet       (stations : position, capacité, opérateur)
  <raw>/tables/gbfs_types_vehicules.parquet
  <raw>/tables/gbfs_etat_stations.parquet  (photo de cette exécution : véhicules disponibles par station)
  <raw>/tables/gbfs_vehicules.parquet      (photo de cette exécution : véhicules en free-floating / par station)
  <raw>/historique/gbfs_*/<date>.parquet   (une archive par photo ; historique complet dans les tables Delta)
"""
import re
from concurrent.futures import ThreadPoolExecutor

import pandas as pd

from .common import get_json, now_utc, pan_catalog, raw_dir, save_json, write_table

FLUX_UTILES = ["system_information", "station_information", "station_status",
               "vehicle_types", "free_bike_status", "vehicle_status"]
# Types fixés pour les historiques : chaque photo s'ajoute à la table Delta sans conflit de schéma,
# même quand un flux renvoie des trous, des 0/1 ou des "true"/"false" à la place de booléens.
TYPES_HISTORIQUES = {
    "vehicules_disponibles": "float64", "places_disponibles": "float64", "lat": "float64", "lon": "float64",
    "est_installee": "boolean", "est_en_location": "boolean", "est_reserve": "boolean", "est_indisponible": "boolean",
}
BOOLEENS = {True: True, False: False, 1: True, 0: False, "true": True, "false": False, "True": True,
            "False": False, "1": True, "0": False}


def _texte(v):
    """GBFS 3.0 met les textes sous forme [{"text": ..., "language": ...}]."""
    if isinstance(v, list):
        return v[0].get("text") if v and isinstance(v[0], dict) else None
    return v


def _typer(df: pd.DataFrame) -> pd.DataFrame:
    for col, type_ in TYPES_HISTORIQUES.items():
        if col in df:
            if type_ == "boolean":
                df[col] = df[col].map(lambda v: BOOLEENS.get(v) if isinstance(v, (bool, int, str)) else None).astype("boolean")
            else:
                df[col] = pd.to_numeric(df[col], errors="coerce").astype(type_)
    return df


def _flux_disponibles(gbfs: dict) -> dict:
    """Retourne {nom_flux: url} depuis le fichier de découverte gbfs.json (v1/v2/v3)."""
    data = gbfs.get("data", {})
    if not isinstance(data, dict):
        return {}
    if isinstance(data.get("feeds"), list):  # v3
        feeds = data["feeds"]
    else:  # v1/v2 : un niveau par langue
        langues = [k for k, v in data.items() if isinstance(v, dict) and "feeds" in v]
        lang = "fr" if "fr" in langues else (langues[0] if langues else None)
        feeds = data[lang]["feeds"] if lang else []
    return {f["name"]: f["url"] for f in feeds if "name" in f and "url" in f}


def _type_flux(contenu: dict) -> str | None:
    """Identifie un flux GBFS publié seul (sans fichier de découverte) d'après son contenu."""
    data = contenu.get("data", {})
    if not isinstance(data, dict):
        return None
    if "stations" in data:
        premiere = (data["stations"] or [{}])[0]
        dispo = {"num_bikes_available", "num_vehicles_available"}
        return "station_status" if dispo & premiere.keys() else "station_information"
    if "vehicle_types" in data:
        return "vehicle_types"
    if "bikes" in data:
        return "free_bike_status"
    if "vehicles" in data:
        return "vehicle_status"
    if "system_id" in data:
        return "system_information"
    return None


def lister_flux() -> pd.DataFrame:
    rows = []
    for ds in pan_catalog():
        if ds.get("type") != "vehicles-sharing":
            continue
        for r in ds.get("resources", []):
            if r.get("format") != "gbfs":
                continue
            rows.append({
                "jeu_id": ds["id"],
                "jeu_slug": ds["slug"],
                "jeu_titre": ds["title"],
                "producteur": (ds.get("publisher") or {}).get("name"),
                "sous_types": ",".join(ds.get("sub_types") or []),
                "est_citiz": "citiz" in ds["title"].lower(),
                "licence": ds.get("licence"),
                "ressource_id": r.get("id"),
                "ressource_titre": r.get("title"),
                "url": r.get("url"),
                "url_originale": r.get("original_url"),
                "page_pan": ds.get("page_url"),
            })
    return pd.DataFrame(rows)


def _telecharger_systeme(url: str, dossier, res: dict, manifestes: bool) -> list[dict]:
    """Télécharge un point d'entrée GBFS et renvoie le contenu de chaque système trouvé.

    Trois cas : fichier de découverte gbfs.json (cas normal), manifeste GBFS 3.0 qui liste
    plusieurs systèmes (ex. Getaround : ~3 700 villes), ou flux unique publié directement."""
    gbfs = get_json(url)
    save_json(gbfs, dossier / "gbfs.json")
    res["version"] = res["version"] or gbfs.get("version", "1.0")
    data = gbfs.get("data", {})

    if isinstance(data, dict) and isinstance(data.get("datasets"), list):  # manifeste
        if not manifestes:
            res["statut"] = f"manifeste non développé ({len(data['datasets'])} systèmes, option manifestes=True)"
            return []
        def un_systeme(i_ds):
            i, ds = i_ds
            versions = sorted(ds.get("versions", []), key=lambda v: v.get("version", ""))
            if not versions:
                return []
            try:
                return _telecharger_systeme(versions[-1]["url"], dossier / str(ds.get("system_id", i)), res, manifestes)
            except Exception as e:
                res["erreurs"].append(f"{ds.get('system_id')}: {e}")
                return []

        with ThreadPoolExecutor(max_workers=16) as pool:
            return [c for liste in pool.map(un_systeme, enumerate(data["datasets"])) for c in liste]

    urls = _flux_disponibles(gbfs)
    if not urls:
        nom = _type_flux(gbfs)
        return [{nom: gbfs}] if nom else []
    contenu = {}
    for nom in FLUX_UTILES:
        if nom in urls:
            try:
                contenu[nom] = get_json(urls[nom])
                save_json(contenu[nom], dossier / f"{nom}.json")
            except Exception as e:  # un flux secondaire en erreur ne bloque pas les autres
                res["erreurs"].append(f"{nom}: {e}")
    return [contenu]


def _extraire(contenu: dict, flux: dict, horodatage: str, res: dict) -> None:
    systeme = contenu.get("system_information", {}).get("data", {})
    commun = {
        "jeu_id": flux["jeu_id"],
        "ressource_id": flux["ressource_id"],
        "systeme_id": systeme.get("system_id"),
        "systeme_nom": _texte(systeme.get("name")) or flux["jeu_titre"],
        "operateur": _texte(systeme.get("operator")) or flux["producteur"],
        "est_citiz": flux["est_citiz"],
        "date_collecte": horodatage,
    }

    types = contenu.get("vehicle_types", {}).get("data", {}).get("vehicle_types", [])
    for t in types:
        res["types"].append({**commun,
                             "vehicle_type_id": t.get("vehicle_type_id"),
                             "form_factor": t.get("form_factor"),
                             "propulsion_type": t.get("propulsion_type"),
                             "nom": _texte(t.get("name"))})
    form_factors = sorted({t.get("form_factor") for t in types if t.get("form_factor")})
    types_vehicules = ",".join(form_factors) or flux["sous_types"]

    for s in contenu.get("station_information", {}).get("data", {}).get("stations", []):
        res["stations"].append({**commun,
                                "types_vehicules": types_vehicules,
                                "station_id": str(s.get("station_id")),
                                "nom": _texte(s.get("name")),
                                "lat": s.get("lat"),
                                "lon": s.get("lon"),
                                "capacite": s.get("capacity"),
                                "adresse": _texte(s.get("address")),
                                "code_postal": s.get("post_code")})

    for s in contenu.get("station_status", {}).get("data", {}).get("stations", []):
        res["etats"].append({**commun,
                             "station_id": str(s.get("station_id")),
                             "vehicules_disponibles": s.get("num_vehicles_available", s.get("num_bikes_available")),
                             "places_disponibles": s.get("num_docks_available"),
                             "est_installee": s.get("is_installed"),
                             "est_en_location": s.get("is_renting"),
                             "derniere_maj": str(s.get("last_reported"))})

    vehicules = (contenu.get("vehicle_status", {}).get("data", {}).get("vehicles")
                 or contenu.get("free_bike_status", {}).get("data", {}).get("bikes", []))
    for v in vehicules:
        res["vehicules"].append({**commun,
                                 "vehicule_id": str(v.get("vehicle_id", v.get("bike_id"))),
                                 "vehicle_type_id": v.get("vehicle_type_id"),
                                 "station_id": v.get("station_id"),
                                 "lat": v.get("lat"),
                                 "lon": v.get("lon"),
                                 "est_reserve": v.get("is_reserved"),
                                 "est_indisponible": v.get("is_disabled")})


def _collecter_flux(flux: dict, horodatage: str, manifestes: bool) -> dict:
    dossier = raw_dir() / "gbfs" / re.sub(r"[^\w-]", "_", f"{flux['jeu_slug']}_{flux['ressource_id']}")
    res = {"statut": "ok", "version": None, "erreurs": [],
           "stations": [], "etats": [], "vehicules": [], "types": []}
    try:
        for contenu in _telecharger_systeme(flux["url"], dossier, res, manifestes):
            _extraire(contenu, flux, horodatage, res)
    except Exception as e:
        res["statut"] = f"erreur: {e}"
    return res


def collecter(seulement_citiz: bool = False, manifestes: bool = False, workers: int = 16) -> dict:
    """seulement_citiz : ne collecte que les flux Citiz.
    manifestes : développe les manifestes multi-systèmes (Getaround), long : ~19 000 requêtes."""
    print("GBFS - mobilités partagées (Point d'Accès National)")
    flux = lister_flux()
    if seulement_citiz:
        flux = flux[flux["est_citiz"]]
    print(f"  {len(flux)} flux GBFS ({flux['est_citiz'].sum()} Citiz)")

    horodatage = now_utc()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        resultats = list(pool.map(lambda f: _collecter_flux(f, horodatage, manifestes), flux.to_dict("records")))

    flux = flux.assign(
        version_gbfs=[r["version"] for r in resultats],
        statut=[r["statut"] for r in resultats],
        erreurs_partielles=[" ; ".join(r["erreurs"])[:500] or None for r in resultats],
        nb_stations=[len(r["stations"]) for r in resultats],
        nb_vehicules=[len(r["vehicules"]) for r in resultats],
        date_collecte=horodatage,
    )
    tables = {
        "gbfs_flux": flux,
        "gbfs_stations": pd.DataFrame([x for r in resultats for x in r["stations"]]),
        "gbfs_types_vehicules": pd.DataFrame([x for r in resultats for x in r["types"]]),
    }
    historiques = {
        "gbfs_etat_stations": _typer(pd.DataFrame([x for r in resultats for x in r["etats"]])),
        "gbfs_vehicules": _typer(pd.DataFrame([x for r in resultats for x in r["vehicules"]])),
    }
    for nom, df in tables.items():
        write_table(df, nom)
    for nom, df in historiques.items():
        if len(df):
            write_table(df, nom, historique=True)
    ok = (flux["statut"] == "ok").sum()
    print(f"  flux collectés : {ok}/{len(flux)}")
    return {**tables, **historiques}


if __name__ == "__main__":
    collecter()
