"""Met à jour les notebooks de l'espace de travail Fabric à partir des fichiers .ipynb
d'une branche du dépôt GitHub.

L'intégration Git native de Fabric avec GitHub n'est pas activée sur notre tenant :
ce notebook en tient lieu, dans un seul sens (le dépôt fait foi). Une modification
faite directement dans Fabric sur un notebook synchronisé est écrasée au prochain
lancement : modifier le code dans le dépôt, puis relancer la synchronisation.

Les notebooks absents du dossier du dépôt (ex. créés par un coéquipier dans Fabric)
ne sont jamais touchés.
"""
import requests
import notebookutils

ctx = notebookutils.runtime.context
LAKEHOUSE = ctx.get("defaultLakehouseName") or LAKEHOUSE_PAR_DEFAUT
# Fichiers bruts (raw.githubusercontent.com) plutôt que l'API GitHub, limitée à 60 requêtes/heure par IP.
RAW = f"https://raw.githubusercontent.com/{DEPOT}/{BRANCHE}/{DOSSIER}"

manifeste = requests.get(f"{RAW}/manifest.json", timeout=30)
manifeste.raise_for_status()
noms = manifeste.json()["notebooks"]
print(f"{DEPOT} @ {BRANCHE} / {DOSSIER} : {len(noms)} notebooks")

bilan = []
for nom in sorted(noms):
    if nom in [n.strip() for n in EXCLURE.split(",")]:
        bilan.append((nom, "ignoré"))
        continue
    reponse = requests.get(f"{RAW}/{nom}.ipynb", timeout=60)
    reponse.raise_for_status()
    contenu = reponse.text
    options = dict(content=contenu, defaultLakehouse=LAKEHOUSE, defaultLakehouseWorkspace=ctx["currentWorkspaceId"])
    try:
        notebookutils.notebook.get(nom)
        existe = True
    except Exception:
        existe = False
    if existe:
        notebookutils.notebook.updateDefinition(name=nom, **options)
        bilan.append((nom, "mis à jour"))
    else:
        notebookutils.notebook.create(nom, **options)
        bilan.append((nom, "créé"))

for nom, action in bilan:
    print(f"  {nom} : {action}")
print("Si un notebook synchronisé est ouvert dans Fabric : 'View changes' puis garder la version enregistrée (Saved version).")
