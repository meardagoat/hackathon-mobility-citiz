"""Synthetic Parquet tables shaped like docs/DATA_CONTRACT.md. Not real Fabric output.

pop_desservie and pop_nouvelle are the values the data pipeline computes from these squares, masked square
included, so tests can check that the API removes the masked part."""
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from app.geo import square_centre

ZONE_IDS = [
    "CRS3035RES200mN2473800E3486600",
    "CRS3035RES200mN2473800E3486800",
    "CRS3035RES200mN2474000E3486600",
]
OPTIONS = {
    "nb_bus": [2, 1, 0],
    "nb_tram": [1, 0, 0],
    "nb_metro": [0, 0, 0],
    "nb_train": [1, 0, 0],
    "nb_bateau": [0, 1, 0],
    "nb_velo": [1, 0, 0],
    "nb_citiz": [1, 0, 0],
}

CARREAUX = {
    "id_carreau": ZONE_IDS,
    "code_commune": ["33063", "33063", "33069"],
    "lat": [square_centre(z)[1] for z in ZONE_IDS],
    "lon": [square_centre(z)[0] for z in ZONE_IDS],
    "population": [412, 37, 6],
    "nb_options": [6, 2, 0],
    **OPTIONS,
    "options_par_habitant": [6 / 412, 2 / 37, 0.0],
    "niveau_acces": [4, 5, 1],
    "couvert_citiz": [True, False, False],
    "donnee_masquee": [False, False, True],
}

OFFRE_EXISTANTE = {
    "id_station": [
        "gtfs_1462783920571650283",
        "gtfs_9928112340017776512",
        "gtfs_3311908765543210001",
        "gtfs_7001234598761234560",
        "gtfs_5550001112223334445",
        "gbfs_5e1a9c_st-12",
        "gbfs_77b0f2_citiz-8",
    ],
    "nom": ["Quinconces", "Quinconces", "Saint-Jean", "Cité du Vin", "Stalingrad", "Hôtel de Ville", "Gambetta"],
    "type": ["tram", "bus", "train", "bateau", "metro", "velo", "citiz"],
    "operateur": ["TBM", "TBM", "SNCF", "TBM", "TBM", "Le Vélo TBM", "Citiz Bordeaux"],
    "code_commune": ["33063"] * 7,
    "lat": [44.8445, 44.8446, 44.8259, 44.8625, 44.8410, 44.8378, 44.8412],
    "lon": [-0.5745, -0.5744, -0.5563, -0.5505, -0.5600, -0.5795, -0.5806],
    "pop_desservie": [455, 455, 0, 0, 0, 0, 0],
}

COSTS = {"bus": 15_000, "citiz": 34_000, "velo": 135_000}
SCENARIOS = {
    ("tous", 100_000): [("bus", 1, 6), ("citiz", 2, 43), ("bus", 0, 0)],
    ("tous", 250_000): [("bus", 1, 6), ("citiz", 2, 43), ("velo", 0, 43), ("bus", 0, 0)],
    ("citiz", 100_000): [("citiz", 2, 43), ("citiz", 1, 0)],
    ("citiz", 250_000): [("citiz", 2, 43), ("citiz", 1, 0), ("citiz", 0, 0)],
}


def _recommendations() -> dict[str, list]:
    columns: dict[str, list] = {name: [] for name in (
        "rang", "id_candidat", "type", "lat", "lon", "code_commune", "cout_eur", "cout_cumule_eur",
        "pop_nouvelle", "score", "adequation", "voitures_evitees", "budget_scenario", "perimetre",
    )}
    for (perimeter, budget), picks in SCENARIOS.items():
        cumulative = 0
        for rank, (kind, zone, people) in enumerate(picks, start=1):
            cumulative += COSTS[kind]
            lon, lat = square_centre(ZONE_IDS[zone])
            row = {
                "rang": rank,
                "id_candidat": f"{kind}_{ZONE_IDS[zone]}",
                "type": kind,
                "lat": lat,
                "lon": lon,
                "code_commune": CARREAUX["code_commune"][zone],
                "cout_eur": COSTS[kind],
                "cout_cumule_eur": cumulative,
                "pop_nouvelle": people,
                "score": round(100 / rank, 1),
                "adequation": 0.8 / rank,
                "voitures_evitees": 8 if kind == "citiz" else 0,
                "budget_scenario": budget,
                "perimetre": perimeter,
            }
            for name, value in row.items():
                columns[name].append(value)
    return columns


RECOMMANDATIONS = _recommendations()
META = {"date_maj": ["2026-10-20T07:30:00Z"], "version": ["1"], "rayon_m": [400]}

TABLES = {
    "carreaux": CARREAUX,
    "offre_existante": OFFRE_EXISTANTE,
    "recommandations": RECOMMANDATIONS,
    "meta": META,
}


def write_table(directory: Path, name: str, columns: dict) -> None:
    pq.write_table(pa.table(columns), directory / f"{name}.parquet")


def write_gold(directory: Path) -> Path:
    for name, columns in TABLES.items():
        write_table(directory, name, columns)
    return directory
