# Soutenance Proxima : pitch de 5 min, démo, plan B, FAQ

Co-présentation : Abdoul (Contexte, Problème, Solution, puis Limites) et Dan (Démo et Recommandation). Créneau de 15 min : 5 min de présentation et démo, puis les questions du jury.
Diapos : 12 au total. Une page de garde (hors chrono), 6 diapos présentées, une page Questions, puis un intercalaire « Annexes » et 3 captures de secours (A1 à A3) pour le plan B. Les notes de chaque diapo reprennent le script ci-dessous, avec le nom de celui qui parle.
Rendu de chaque diapo à 1920×1080 : dossier [rendu_diapos/](rendu_diapos/).
Diapos : sources HTML dans [deck/](deck/), rendus 1920×1080 dans [rendu_diapos/](rendu_diapos/). Captures de secours : dossier [plan_b/](plan_b/).

Tous les chiffres viennent des données réelles (collecte du 20/10/2026 à 09:40 UTC), de l'API en mode `real` et du notebook `fabric/notebooks/05_score_classement.ipynb`. Leur source est donnée en fin de document.

---

## 1. Les 12 diapos et leur objectif

| # | Diapo | Qui | Objectif : ce que le jury doit retenir | Temps |
|---|---|---|---|---|
| 1 | Page de garde | — | Proxima, la question posée, l'équipe et ses rôles, les trois partenaires | hors chrono, pendant l'installation |
| 2 | Contexte | Abdoul | Citiz veut s'étendre ; on a pris un terrain réel : Bordeaux Métropole, 28 communes, 752 544 habitants, 94 stations | 0:00 → 0:30 |
| 3 | Problème | Abdoul | 72,7 % des habitants n'ont pas de Citiz à 5 min, alors que 98,1 % ont un autre transport : c'est la voiture partagée qui manque | 0:30 → 1:00 |
| 4 | Solution | Abdoul | Une chaîne complète et reproductible : Fabric (01-02-03 → Lakehouse → 04 → 05) → API → app | 1:00 → 1:40 |
| 5 | Démo | Dan | L'outil marche sur les vraies données, et un budget devient une liste d'emplacements | 1:40 → 3:10 |
| 6 | Recommandation | Dan | 1 M€ → 29 stations, 986 k€, +106 860 habitants, 27,3 % → 41,5 %, 232 voitures en moins | 3:10 → 4:00 |
| 7 | Limites | Abdoul | On connaît nos limites et on sait quoi faire ensuite | 4:00 → 5:00 |
| 8 | Questions | les deux | Merci ; rappel de la recommandation en 3 chiffres, équipe, logos, dépôt GitHub | pendant les questions |
| 9 | Annexes (intercalaire) | — | « Captures de secours, mêmes données que la démo » | plan B seulement |
| 10-12 | A1 · A2 · A3 | Dan | Captures de l'Explorer 1 M€, de la station n°1 et du classement | plan B seulement |

---

## 2. Script mot à mot, minuté

Rythme visé : environ 140 mots par minute. Les passages entre crochets sont des gestes, pas du texte à dire.

### Diapo 1 · Page de garde (hors chrono)

Affichée pendant l'installation, Dan à côté de l'ordinateur de démo. Au top du jury, le chrono démarre : Abdoul dit « Bonjour… » et passe à la diapo 2.

### Diapo 2 · Contexte · Abdoul (0:00 → 0:30)

> Bonjour, je suis Abdoul, de l'équipe Proxima, avec Dan, Komlan, Catrielle et Mariane.
> Citiz veut s'implanter dans de nouvelles villes. Sa question : avec un budget donné, où ouvrir les prochaines stations ?
> On y a répondu sur un terrain réel : Bordeaux Métropole. 28 communes, 752 544 habitants, 94 stations Citiz.

[Diapo suivante]

### Diapo 3 · Problème · Abdoul (0:30 → 1:00)

> Le constat : 72,7 % des habitants n'ont aucune Citiz à moins de 5 minutes à pied.
> Pourtant, 98 % ont déjà un bus, un tram ou un vélo à 5 minutes. Ce qui manque, c'est la voiture partagée.
> Et une station coûte 34 000 euros sur trois ans : il faut savoir où chaque euro touche le plus d'habitants.

[Diapo suivante]

### Diapo 4 · Solution · Abdoul (1:00 → 1:40)

> Notre outil est une chaîne complète sur Microsoft Fabric.
> Trois notebooks collectent les données ouvertes : population INSEE au carreau de 200 mètres, stations Citiz et vélo, réseau TBM. Tout arrive dans un Lakehouse.
> Le notebook 04 calcule qui a quoi à 400 mètres.
> Le notebook 05 prédit, avec un gradient boosting évalué en validation croisée spatiale, à quoi ressemble un emplacement Citiz : AUC de 0,94. Puis il choisit, sous budget, les lieux qui gagnent le plus d'habitants par euro, sans compter deux fois les mêmes.
> Une API sert le résultat à l'application. Dan va vous la montrer.

[Diapo « Démo ». Dan prend le clavier, Cmd+Tab vers le navigateur]

### Diapo 5 · Démo · Dan (1:40 → 3:10)

Le texte est dans la section 3 ci-dessous, avec chaque clic.

### Diapo 6 · Recommandation · Dan (3:10 → 4:00)

> Notre recommandation : 1 million d'euros sur trois ans, 29 stations, 986 000 euros dépensés.
> Résultat : 106 860 habitants de plus à 5 minutes d'une voiture partagée. La couverture passe de 27,3 à 41,5 %, pour environ 9 euros par habitant.
> Avec l'hypothèse Citiz de 8 voitures remplacées par voiture partagée : 232 voitures en moins.
> Et pas seulement au centre : Lormont, Le Bouscat et Cenon d'abord, 9 communes en tout. Parmi les ménages nouvellement desservis, 20,5 % sont pauvres, contre 15,1 % en moyenne.
> Abdoul, nos limites.

[Diapo suivante, Abdoul reprend]

### Diapo 7 · Limites · Abdoul (4:00 → 5:00)

> Six limites, assumées.
> Un : 1 983 carreaux sont masqués par le secret statistique. Leur population n'est jamais affichée ni comptée.
> Deux : le modèle bus est faible, AUC 0,663 : il y a des arrêts presque partout.
> Trois : le vélo n'est jamais retenu : 135 000 euros sur trois ans, quatre fois une Citiz.
> Quatre : 5 minutes, c'est un rayon de 400 mètres à vol d'oiseau. On surestime donc la couverture.
> Cinq : les coûts sont sourcés, mais le prix du véhicule reste à confirmer avec Citiz.
> Six : la n°1, Lormont, a moins de 0,1 % d'adéquation. Elle ne ressemble pas aux stations actuelles, toutes au centre. Le modèle apprend où Citiz est, pas où il réussira. C'est pourquoi la population pèse plus que le modèle, et pourquoi on propose d'y ouvrir d'abord une station pilote.
> La suite : de vrais trajets à pied, des coûts validés avec Citiz, et une deuxième ville. Merci, place à vos questions.

[Diapo 8 · Questions, elle reste affichée pendant les questions]

Si on est en retard à 4:00 : dire seulement les limites 2, 3 et 6, puis « La suite ».

### Diapo 8 · Questions

Qui répond à quoi :
- **Abdoul** : données et sources, Fabric et Lakehouse, coûts, carbone, équité, vie privée, stigmatisation, rayon de 400 m, autre ville, pourquoi Bordeaux (FAQ 1, 7, 8, 9, 10, 11, 13, 14).
- **Dan** : modèle et AUC, comparaison à une règle simple, adéquation de la n°1, optimisation, double compte, vélo et bus, API et application (FAQ 2, 3, 4, 5, 6, 12).

Celui qui ne sait pas passe la main. Si personne ne sait : « On ne l'a pas mesuré ; voilà comment on le ferait. »

---

## 3. Démo clic par clic · Dan (1:40 → 3:10)

### Avant de monter sur scène (à faire à 13h, puis à vérifier juste avant le passage)

1. Lancer le backend en mode réel (port 8000) :
   ```bash
   cd backend && DATA_MODE=real DATA_DIR=../data/processed/gold_fabric ../.venv/bin/uvicorn app.main:app --port 8000
   ```
2. Vérifier qu'il répond : `curl localhost:8000/health` doit renvoyer `{"status":"ok"}`.
3. Lancer le frontend (port 3000), version compilée (`npx next start -p 3000`), et ouvrir `http://localhost:3000/` dans Chrome.
4. Passer l'accueil (bouton « Passer »). Vérifier : 1 M€, « Citiz seul », 29 emplacements, +106 860.
5. Ouvrir une fois « Classement » pour charger les 8 scénarios, puis revenir sur « Explorer ».
6. Chrome en plein écran (Cmd+Ctrl+F), zoom navigateur à 100 % (Cmd+0), notifications coupées, Wi-Fi inutile (tout est en local), mise en veille désactivée.
7. Diapos ouvertes dans une autre fenêtre, en mode présentation, sur la diapo 1 (page de garde). Cmd+Tab bascule entre les deux.
8. Les captures du dossier `plan_b/` et les annexes A1 à A3 (diapos 10 à 12) sont prêtes.

### Pendant la démo

Les raccourcis clavier ne marchent qu'après un clic sur la carte (pas dans un champ) : cliquer une fois sur une zone vide de la carte avant d'appuyer sur une touche.

| Temps | Action | À dire | À l'écran |
|---|---|---|---|
| 1:40 | Cmd+Tab vers Chrome (Explorer, 1 M€, Citiz seul). Clic sur une zone vide de la carte. | « Voici la métropole. Chaque colonne est un carreau de 200 mètres, sa hauteur, c'est le nombre d'habitants. En turquoise, une Citiz à 5 minutes. En gris, d'autres transports mais pas de Citiz. En rouge, rien du tout. » | Carte 3D, légende à gauche |
| 1:55 | Touche **1** | « Avec 100 000 euros, l'outil ouvre 2 stations : 10 122 habitants gagnés. » | Compteurs : 2 · +10 122 · 68 k€ · 16 |
| 2:05 | Touche **4** (les balises s'allument une à une, 3 s) | « Avec 1 million : 29 stations, 986 000 euros, 106 860 habitants gagnés. La couverture passe de 27,3 à 41,5 %. Et 232 voitures en moins. » | 29 · +106 860 · 986 k€ · 232 · barre 27,3 % → 41,5 % |
| 2:30 | Clic sur la ligne **01 Lormont** dans la liste de droite | « La première, c'est Lormont : 5 523 habitants gagnés pour 34 000 euros. Les carreaux verts sont ceux qu'elle met à moins de 5 minutes. » | Zoom sur Lormont |
| 2:45 | Clic sur **Classement** dans le menu en haut à droite | « Le même résultat en tableau : rang, commune, habitants gagnés, coût, coût cumulé et adéquation du modèle. Le graphique compare les quatre budgets : 10 000, 31 000, 58 000 puis 107 000 habitants gagnés. » | Graphique des budgets, barre 1 M€ en vert foncé |
| 3:05 | Faire défiler jusqu'au tableau, montrer la colonne Adéquation du rang 01 (« < 0,1 % ») | « Retenez ce “moins de 0,1 %”, Abdoul y reviendra. » | Tableau du classement |
| 3:10 | Cmd+Tab vers les diapos, diapo 6 (Recommandation) | | |

Touche **R** : rejoue l'allumage des balises si l'animation a été manquée.
Ne pas montrer pendant le pitch : pages « Chiffres » et « Offre », bouton « Citiz + bus + vélo ». On les garde pour les questions.

---

## 4. Plan B si la démo plante

**Quand basculer** : page blanche plus de 5 s, bandeau rouge « Données indisponibles » ou « Scénario indisponible », carte qui ne se dessine pas, ordinateur figé. On ne débogue pas devant le jury.

**Quoi dire** : « La démo ne répond pas, je vous montre les captures faites cet après-midi sur exactement les mêmes données. »

**Quoi montrer** : revenir aux diapos et aller directement à la diapo 10 (A1), en sautant l'intercalaire, avec le même texte que la démo.

| Étape de la démo | Annexe dans les diapos | Fichier de secours |
|---|---|---|
| Lire la carte, 1 M€ | Diapo 10 · A1 · Explorer · 1 M€ · Citiz seul | `plan_b/04_explorer_1M_citiz.png` |
| Station n°1 | Diapo 11 · A2 · Recommandation n°1 · Lormont | `plan_b/05_explorer_rang1.png` |
| Classement | Diapo 12 · A3 · Classement · 1 M€ · Citiz seul | `plan_b/08b_classement_tableau.png` et `plan_b/07_classement_1M_citiz.png` |

Après A3, revenir directement à la diapo 6 (Recommandation).

Autres captures disponibles pour les questions : écrans d'accueil (`01` à `03`), scénario « Citiz + bus + vélo » (`06`), page Chiffres (`09`), page Offre (`10`).

**Si les diapos elles-mêmes ne s'ouvrent pas** : exporter le deck en PDF avant la soutenance (menu Partager > Exporter) et le garder sur le bureau et sur une clé USB. Le PDF embarque les polices ; un export PPTX ouvert sur un ordinateur sans la police Fira Sans la remplace par une autre (les logos, en PNG, restent nets).

**Si un bandeau rouge apparaît mais que la page s'affiche** : cliquer une fois sur « Réessayer ». Si ça ne passe pas en 5 s, plan B.

---

## 5. FAQ du jury : 14 questions, réponses chiffrées

**1. Pourquoi Bordeaux ?**
Citiz y est déjà (94 stations dans la métropole), donc on peut valider le modèle sur l'existant, mais la marge est forte. À l'échelle du département, la Gironde a 6,2 stations pour 100 000 habitants et 13 % de la population à 5 min d'une Citiz, contre 19,0 et 27 % dans le Bas-Rhin. L'offre de transport est riche (tram, bus, bateau, vélo) et le contraste centre / périphérie est fort, utile pour parler d'équité.

**2. Comment le modèle est-il évalué ?**
Gradient boosting (HistGradientBoosting de scikit-learn) sur les 6 644 carreaux habités. Cible : y a-t-il déjà une station du type à moins de 200 m du carreau ? Validation croisée spatiale : 5 plis, groupés par blocs de 2 km, pour qu'un carreau ne soit jamais évalué avec ses voisins dans l'entraînement. AUC : Citiz 0,944 (243 carreaux positifs), vélo 0,917 (500), bus 0,663 (3 645).

**3. Votre modèle fait-il mieux qu'une règle simple ?**
À peine pour Citiz, pas du tout pour le bus, et on le dit. Classer les carreaux par distance au centre de Bordeaux donne déjà une AUC de 0,939 pour Citiz (0,944 pour le modèle). Pour le bus, classer par population à 400 m donne 0,668, un peu mieux que le modèle (0,663) : le modèle n'apporte rien pour le bus, il y a des arrêts partout. L'emplacement actuel de Citiz s'explique surtout par la centralité. C'est pour ça que l'adéquation ne fait que pondérer la valeur, et que la population nouvellement couverte reste le critère principal.

**4. La n°1 a moins de 0,1 % d'adéquation : pourquoi la recommander ?**
La valeur d'un lieu, c'est la population pas encore couverte × (0,5 + 0,5 × le rang de son adéquation), avec +50 % pour les habitants qui n'ont aucune option. L'adéquation peut donc au plus diviser la valeur par deux. Lormont gagne 5 523 habitants, le plus gros gain de la liste ; même pénalisée, elle reste devant. 19 des 29 stations ont une adéquation sous 5 % : le modèle reconnaît le centre de Bordeaux, alors que les gains sont en périphérie. D'où la recommandation de commencer par une station pilote.

**5. Pourquoi un algorithme glouton et pas une optimisation exacte ?**
Glouton paresseux : à chaque étape, on prend le lieu qui ajoute le plus de valeur par euro, puis on met à jour qui est couvert. Dans le scénario Citiz seul, toutes les stations coûtent 34 k€ : c'est un problème de couverture maximale à nombre de sites fixé, pour lequel le glouton garantit au moins 63 % (1 − 1/e) de l'optimum, et fait en général bien mieux. Une résolution exacte (PuLP) était prévue et n'a pas été faite.

**6. Comment évitez-vous de compter deux fois les mêmes habitants ?**
Après chaque choix, les carreaux couverts sont marqués : la station suivante ne compte que les habitants encore non couverts. Les 106 860 habitants du scénario 1 M€ sont donc des personnes distinctes (recalcul vérifié carreau par carreau). Seule exception, signalée dans l'app par « Gains cumulés* » : en « Citiz + bus + vélo », un habitant qui gagne un bus et une Citiz compte une fois par type.

**7. D'où viennent les coûts ?**
Sur 3 ans, investissement + fonctionnement.
Citiz : 25 000 € (boîtier embarqué 4 000 €, véhicule environ 20 000 €, signalisation) + 3 000 €/an, soit 34 000 €. Sources : convention Citiz du Pôle métropolitain du Genevois français (2023) pour le boîtier et l'exploitation ; le prix du véhicule est notre estimation, à confirmer avec Citiz.
Vélo : 15 vélos × 3 000 €/an × 3 ans = 135 000 € (fourchette de 2 000 à 4 000 €/vélo/an, compilation Le Monde 2015 reprise par We Demain).
Arrêt de bus : 15 000 € (fourchette Cerema de 10 700 à 23 000 € pour un arrêt accessible).

**8. Et l'impact carbone ?**
232 voitures particulières en moins pour 29 stations, avec l'hypothèse du livre blanc Citiz 2025 : 8 voitures remplacées par voiture partagée, et une voiture par station. On n'a pas converti ce chiffre en tonnes de CO₂ dans l'outil : il faudrait des hypothèses de kilométrage qu'on n'a pas sourcées. C'est la suite logique.

**9. Ne servez-vous pas seulement les zones déjà bien desservies ?**
Non, c'est même l'inverse. On donne +50 % de valeur aux habitants qui n'ont aucune option à 400 m (14 211 habitants dans la métropole). Le plan à 1 M€ couvre 9 communes : Bordeaux (8 stations), Mérignac (5), Cenon (4), Le Bouscat (3), Lormont, Talence, Pessac et Bègles (2 chacune), Villenave-d'Ornon (1). Parmi les ménages nouvellement desservis, 20,5 % sont sous le seuil de pauvreté, contre 15,1 % dans toute la métropole et 18,0 % parmi ceux déjà desservis.

**10. Et la vie privée dans les zones peu peuplées ?**
L'INSEE masque les carreaux de moins de 11 ménages : 1 983 carreaux sur 6 644 (30 %), soit environ 3 % de la population. L'API ne renvoie jamais leur population, ni le nombre d'options par habitant, et les exclut de tous les totaux. Le niveau d'accès affiché ne dépend que du nombre d'options à 400 m, pas de la population : il ne révèle rien sur ces carreaux.

**11. Une carte « zone mal desservie » ne stigmatise-t-elle pas des quartiers ?**
La carte décrit l'offre de transport, pas les habitants : « zone blanche » veut dire « aucun arrêt ni station à 400 m », rien de plus. On n'affiche aucun indicateur social par carreau dans l'application ; le taux de pauvreté n'est utilisé qu'en agrégé, pour vérifier l'équité du plan.

**12. Pourquoi le vélo et le bus ne sont-ils presque jamais choisis ?**
Le vélo coûte 135 k€ par station, 4 fois une Citiz, pour un gain comparable : il n'est jamais rentable par euro. Le bus ne coûte que 15 k€, mais plus de 96 % des habitants ont déjà un arrêt à 400 m, et un nouvel arrêt doit être à moins de 800 m d'une ligne existante. En « Citiz + bus + vélo » à 1 M€, l'outil choisit 28 Citiz et 3 arrêts de bus, pour 997 k€.

**13. Pourquoi 400 m à vol d'oiseau ?**
5 minutes à environ 80 m par minute font 400 m. Le calcul sur le réseau piéton OpenStreetMap a été envisagé puis abandonné faute de temps. Le vol d'oiseau surestime la couverture, puisque le vrai trajet est plus long : les chiffres sont des plafonds. C'est la première amélioration prévue.

**14. Comment Citiz l'utilise-t-il dans une autre ville ?**
Toutes les sources sont nationales et ouvertes : carreaux INSEE pour toute la France, GBFS Citiz (1 617 stations collectées), GTFS publié par chaque réseau. Il suffit de changer la liste des communes et le flux GTFS, puis de relancer les notebooks 01 à 05 dans Fabric. L'API relit les fichiers produits sans changement de code. Limite : les budgets sont précalculés (100 k€, 250 k€, 500 k€, 1 M€) ; un budget libre demanderait de lancer le classement à la demande.

Questions de secours, réponses courtes :
- **Pourquoi Fabric ?** Conseillé par le sujet ; Lakehouse en Delta, notebooks planifiables, point de terminaison SQL lisible par Power BI.
- **Les données sont-elles à jour ?** Stations et arrêts collectés le 20/10/2026 ; population INSEE Filosofi 2021.
- **Combien de candidats ?** Tout centre de carreau habité qui ferait gagner au moins 100 habitants ; un nouvel arrêt de bus doit être à moins de 800 m d'un arrêt existant.

---

## 6. D'où vient chaque chiffre

| Chiffre | Source vérifiée |
|---|---|
| 752 544 habitants, 94 stations Citiz, 27,3 % couverts, 98,1 % avec au moins une option, 1 983 carreaux masqués, 6 644 carreaux, 2 419 arrêts | `GET /api/v1/statistics/summary` (mode real) |
| 72,7 % sans Citiz | 1 − 0,2734 |
| 29 stations, 986 k€ (reste 14 k€), +106 860, 232 voitures, rang 1 Lormont +5 523, adéquation 0,006 % (affichée « < 0,1 % ») | `POST /api/v1/recommendations` budget 1 000 000, Citiz seul |
| 41,5 % | (205 771 + 106 860) / 752 544 |
| 2 stations et +10 122 à 100 k€ ; 7 stations et +31 275 à 250 k€ ; 14 stations et +57 606 à 500 k€ | même endpoint, autres budgets |
| 28 Citiz + 3 bus, 997 k€, Citiz +103 781, bus +5 457 | même endpoint, « Citiz + bus + vélo » |
| AUC 0,944 / 0,917 / 0,663, références 0,939 et 0,668 | notebook 05 réexécuté sur `data/processed/gold_fabric` avec scikit-learn 1.5.2, la version du runtime Python de Fabric (fixée dans requirements.txt) |
| 34 k€, 135 k€, 15 k€ | constantes `COUTS` et `ANNEES` du notebook 05, sources dans `docs/DATA_CONTRACT.md` |
| 20,5 % / 15,1 % / 18,0 % de ménages pauvres, 14 211 habitants sans option | `carreaux.parquet` (colonnes `men_pauv`, `men`, `nb_options`), hors carreaux masqués |
| 6,2 stations / 100 000 hab. et 13 % en Gironde | `docs/PROJET.md`, section 5 |
