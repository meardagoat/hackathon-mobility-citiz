import zipfile

import pandas as pd
import pytest

from src.ingestion import gtfs
from src.ingestion.common import tables_dir

CONTENU = {
    "agency": "agency_id,agency_name\nA,Réseau\n",
    "routes": "route_id,route_type\nR{n},3\n",
    "stops": "stop_id,stop_name,stop_lat,stop_lon\nS{n},{nom},44.8,-0.5\n",
    "trips": "route_id,trip_id,service_id\nR{n},T{n},W\n",
    "calendar": "service_id,monday\nW,1\n",
    "calendar_dates": "service_id,date,exception_type\nW,20261020,1\n",
    "stop_times": "trip_id,stop_id,stop_sequence\nT{n},S{n},1\n",
}


@pytest.fixture(autouse=True)
def raw(tmp_path, monkeypatch):
    monkeypatch.setenv("RAW_DIR", str(tmp_path))
    (tmp_path / "gtfs" / "zips").mkdir(parents=True)
    return tmp_path


def _zip(raw, slug, rid, nom, sans=()):
    with zipfile.ZipFile(raw / "gtfs" / "zips" / f"{slug}_{rid}.zip", "w") as z:
        for fichier, texte in CONTENU.items():
            if fichier not in sans:
                z.writestr(f"{fichier}.txt", texte.format(n=rid, nom=nom))


def _catalogue():
    base = dict(zones_couvertes="Bordeaux Métropole", zones_insee="", reseaux="", producteur="", mise_a_jour=None,
                licence="lov2", disponible=True)
    return pd.DataFrame([
        {**base, "jeu_slug": "tbm", "ressource_id": "r1", "jeu_titre": "TBM", "url": "u1"},
        {**base, "jeu_slug": "cars", "ressource_id": "r2", "jeu_titre": "Cars", "url": "u2"},
    ])


def _table(nom):
    return pd.read_parquet(tables_dir() / f"{nom}.parquet")


def _statuts():
    return _table("gtfs_ressources").set_index("ressource_id")


@pytest.mark.parametrize("fichier", ["routes", "stops", "trips", "stop_times"])
def test_fichier_requis_absent_conserve_les_donnees_precedentes(raw, fichier):
    _zip(raw, "tbm", "r1", "Quinconces")
    _zip(raw, "cars", "r2", "Libourne")
    gtfs.gtfs_complets(_catalogue(), ["Bordeaux Métropole"])
    premiere = _table("gtfs_stops").set_index("ressource_id")["date_collecte"]

    _zip(raw, "tbm", "r1", "Quinconces v2", sans=(fichier,))
    _zip(raw, "cars", "r2", "Libourne v2")
    gtfs.gtfs_complets(_catalogue(), ["Bordeaux Métropole"])

    statuts = _statuts()
    assert statuts.loc["r1", "statut"] == f"erreur: fichiers absents : {fichier}.txt"
    assert bool(statuts.loc["r1", "donnees_precedentes"]) is True
    assert statuts.loc["r2", "statut"] == "ok" and not statuts.loc["r2", "donnees_precedentes"]
    arrets = _table("gtfs_stops").set_index("ressource_id")
    assert arrets.loc["r1", "stop_name"] == "Quinconces"
    assert arrets.loc["r1", "date_collecte"] == premiere["r1"]
    assert arrets.loc["r2", "stop_name"] == "Libourne v2"
    for table in ("gtfs_routes", "gtfs_trips", "gtfs_stop_times"):
        assert sorted(_table(table)["ressource_id"]) == ["r1", "r2"], table


def test_premiere_collecte_sans_fichier_requis_ne_publie_pas_le_reseau(raw):
    _zip(raw, "tbm", "r1", "Quinconces", sans=("trips",))
    _zip(raw, "cars", "r2", "Libourne")
    gtfs.gtfs_complets(_catalogue(), ["Bordeaux Métropole"])
    statuts = _statuts()
    assert statuts.loc["r1", "statut"] == "erreur: fichiers absents : trips.txt"
    assert not statuts.loc["r1", "donnees_precedentes"]
    assert _table("gtfs_stops")["ressource_id"].tolist() == ["r2"]


def test_stop_times_requis_seulement_avec_les_horaires(raw):
    _zip(raw, "tbm", "r1", "Quinconces", sans=("stop_times",))
    _zip(raw, "cars", "r2", "Libourne", sans=("stop_times",))
    gtfs.gtfs_complets(_catalogue(), ["Bordeaux Métropole"], avec_stop_times=False)
    assert set(_statuts()["statut"]) == {"ok"}
    assert sorted(_table("gtfs_stops")["ressource_id"]) == ["r1", "r2"]

    gtfs.gtfs_complets(_catalogue(), ["Bordeaux Métropole"], avec_stop_times=True)
    assert set(_statuts()["statut"]) == {"erreur: fichiers absents : stop_times.txt"}


def test_fichiers_facultatifs_absents_restent_acceptes(raw):
    _zip(raw, "tbm", "r1", "Quinconces", sans=("agency", "calendar", "calendar_dates"))
    _zip(raw, "cars", "r2", "Libourne")
    gtfs.gtfs_complets(_catalogue(), ["Bordeaux Métropole"])
    assert set(_statuts()["statut"]) == {"ok"}
