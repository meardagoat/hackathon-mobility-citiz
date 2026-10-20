# 🎤 Script de Présentation Frontend - Hackathon Mobilité

**Durée : 5 minutes**  
**Pour : Jury final / Démo technique**

---

## 📋 Introduction (30 sec)

> "Bonjour, je suis **Komlan malik-junior Edah**, responsable du frontend.
> 
> J'ai développé **l'interface web de visualisation et d'aide à la décision** pour optimiser l'implantation de stations de mobilité partagée à Bordeaux Métropole.
> 
> L'interface permet de **visualiser la couverture actuelle**, **identifier les zones mal desservies**, et **recommander les meilleurs emplacements** pour de nouvelles stations."

---

## 🎨 PARTIE 1 : Vue d'Ensemble (1 min)

### Stack Technique

> "J'ai choisi une **stack moderne et professionnelle** :
> 
> - **Next.js 14 avec TypeScript** : framework React pour la structure et la sécurité du typage
> - **Tailwind CSS** : design moderne et responsive
> - **Leaflet** : bibliothèque cartographique open-source avec support natif GeoJSON
> - **Recharts** : graphiques interactifs
> - **Axios** : communication avec le backend
> 
> L'architecture est **modulaire** : 25+ composants réutilisables organisés par domaine, 3 hooks custom pour la gestion d'état, et un service API centralisé."

### Design

> "Le design suit les **standards professionnels** :
> - Sidebar noir fixe avec navigation claire
> - Interface épurée, moderne
> - Couleurs cohérentes par type de transport (bus bleu, métro rouge, tram vert, vélo orange, autopartage violet, trottinette rose)
> - Responsive, optimisé desktop pour la démo"

---

## 📊 PARTIE 2 : Les 3 Pages (2 min)

### Page 1 : Dashboard

> "La **page d'accueil** affiche une vue d'ensemble des statistiques :
> 
> [Montrer la page Dashboard]
> 
> - **4 KPIs en haut** : population totale, nombre de stations, taux de couverture global, options par habitant
> - **Graphique en barres** : répartition de la population par niveau de couverture (5 tranches : très faible, faible, moyen, bon, excellent)
> - **Graphique camembert** : répartition des stations par type de transport
> 
> Ces données proviennent de l'API backend via les endpoints `/statistics/summary` et `/statistics/population`."

### Page 2 : Carte Interactive

> "La **carte interactive** est le cœur de la visualisation :
> 
> [Montrer la page Carte]
> 
> - **Heat map de couverture** : chaque zone (carreau de 200m) est colorée selon son score d'accessibilité
>   - Rouge : couverture faible (< 40%)
>   - Orange : couverture moyenne (40-60%)
>   - Vert : bonne couverture (60-80%)
>   - Bleu : excellente couverture (> 80%)
> 
> - **Marqueurs des stations** : chaque station existante est représentée par un marqueur coloré selon son type
> 
> - **Filtres interactifs** : on peut filtrer par type de transport pour voir uniquement les bus, les vélos, ou l'autopartage Citiz
> 
> - **Popup détaillée** : en cliquant sur une station, on voit le nom, le nombre de personnes desservies, les lignes disponibles
> 
> La carte est **centrée sur Bordeaux Métropole** (notre cas d'étude) et utilise les données en format GeoJSON standard via Leaflet.
> 
> [Démonstration interactive : cliquer sur un marqueur, changer les filtres]"

### Page 3 : Recommandations

> "La **page recommandations** est l'outil d'aide à la décision :
> 
> [Montrer la page Recommandations]
> 
> **Côté gauche - Formulaire de configuration :**
> - Budget disponible (ex: 1 million d'euros)
> - Types de transport à considérer (bus, tram, vélo, autopartage)
> - Contraintes : population minimum desservie, priorité (zones mal desservies ou zones denses)
> - Coûts estimés par type de station
> 
> **Côté droit - Résultats :**
> 
> Après calcul par l'algorithme du backend (modèle d'adéquation + optimisation génétique), on obtient :
> 
> - **Résumé global en haut** :
>   - Budget utilisé : 490 000 € / 1 000 000 €
>   - Population totale desservie : +28 450 habitants
>   - Amélioration moyenne de couverture : +4,2%
> 
> - **Liste des emplacements recommandés** triée par score d'impact, chaque carte affiche :
>   - Rang (1er, 2e, 3e...)
>   - Adresse précise
>   - Type de station (ex: autopartage Citiz)
>   - Coût : 50 000 €
>   - Impact : +4 850 habitants desservis, +4,5% de couverture
>   - Score : 92/100
>   - Justification : 'Zone densément peuplée avec faible couverture actuelle...'
> 
> Cette page transforme les résultats de l'algorithme en **recommandations concrètes et actionnables** pour les décideurs."

---

## 🏗️ PARTIE 3 : Architecture Technique (1 min)

### Organisation du Code

> "L'architecture est **modulaire et maintenable** :
> 
> **Types TypeScript** (`types/api.ts`) :
> - Définit tous les formats de données (Station, Zone, Recommendation...)
> - Sécurité : le compilateur vérifie que les données sont correctes
> - Autocomplétion dans l'IDE
> 
> **Service API** (`lib/api.ts`) :
> - Centralise tous les appels au backend
> - 6 méthodes pour les 6 endpoints MVP
> - Gestion d'erreurs, timeout, retry automatique
> 
> **Hooks Custom** (`hooks/`) :
> - `useStatistics()` : récupère et cache les stats du dashboard
> - `useStations()` : gère les stations avec filtres
> - `useCoverage()` : gère les données de couverture
> - Pattern React moderne pour la gestion d'état
> 
> **Composants** organisés par domaine :
> - `components/ui/` : 8 composants de base réutilisables (Button, Card, Modal...)
> - `components/dashboard/` : 4 composants statistiques
> - `components/map/` : 6 composants cartographiques
> - `components/recommendations/` : 4 composants recommandations
> - `components/filters/` : 3 composants de filtrage"

### Support GeoJSON

> "Point technique important : l'interface supporte **nativement le format GeoJSON** via Leaflet.
> 
> Le backend peut envoyer des données géographiques au format standard (points, polygones, FeatureCollections) et l'interface les affiche automatiquement sur la carte.
> 
> J'ai créé un composant `GeoJSONLayer` qui gère :
> - Les zones de couverture (polygones colorés)
> - Les stations (marqueurs ponctuels)
> - Les recommandations (points avec popup)
> 
> Pas besoin de bibliothèque supplémentaire, Leaflet est compatible GeoJSON nativement."

---

## 🎯 PARTIE 4 : Cas d'Étude Bordeaux (30 sec)

> "Nous avons choisi **Bordeaux Métropole** comme cas d'étude concret :
> 
> **Données analysées** (par l'équipe data) :
> - 6 644 carreaux de 200m
> - 5 810 stations TBM (Transports Bordeaux Métropole)
> 
> **Couverture actuelle** :
> - Bus/Tram : 96,5% des habitants ✅
> - Vélo partagé : 40,2%
> - Citiz (autopartage) : 26,6% ❌
> 
> **Objectif du projet** : améliorer la couverture Citiz
> 
> **Résultat avec 1M€** d'investissement :
> - 29 nouvelles stations Citiz recommandées
> - ~107 000 habitants nouvellement servis
> - Couverture portée à 40,4% (+13,8 points)
> - ~232 voitures en moins estimées
> 
> L'interface est **adaptée** : carte centrée sur Bordeaux, région par défaut, données TBM + Citiz."

---

## 🔌 PARTIE 5 : Intégration Backend (30 sec)

> "L'interface est **prête à se connecter au backend** :
> 
> **6 endpoints API attendus** (MVP) :
> 1. `GET /mobility/coverage` → Zones géographiques
> 2. `GET /mobility/heatmap` → Données heat map optimisées
> 3. `GET /stations` → Stations existantes
> 4. `GET /statistics/summary` → KPIs globaux
> 5. `GET /statistics/population` → Répartition population
> 6. `POST /recommendations` → Calcul recommandations
> 
> **Documentation complète fournie** :
> - `API_CONTRACT_VALIDATION.md` : validation du contrat API v1.1
> - `API_SPECIFICATION.md` : spécification de chaque endpoint avec exemples JSON
> - `GEOJSON_COMPATIBILITY.md` : confirmation compatibilité format
> 
> **3 points critiques validés** avec le backend :
> 1. Coordonnées GeoJSON : [longitude, latitude] (standard)
> 2. Scores entre 0 et 1 (pas de pourcentages : 0.85 pas 85)
> 3. Types de transport standardisés : 'bus' | 'metro' | 'tram' | 'bike' | 'carsharing' | 'scooter'
> 
> Actuellement, l'interface fonctionne avec des **données de démonstration** (mock data). Dès que le backend est déployé, on change juste l'URL dans la config et tout fonctionne automatiquement."

---

## 🎯 CONCLUSION (30 sec)

> "En résumé, j'ai livré :
> 
> ✅ **Interface complète** : 3 pages, 25+ composants, design professionnel
> ✅ **Architecture solide** : TypeScript, modulaire, maintenable
> ✅ **Support GeoJSON natif** : cartographie standard
> ✅ **Documentation complète** : validation API, spécifications, guides
> ✅ **Adapté Bordeaux** : cas d'étude concret avec vraies données
> 
> **L'interface est opérationnelle** et prête pour l'intégration avec le backend.
> 
> L'outil permet aux décideurs (collectivités, opérateurs de mobilité) de **visualiser l'accessibilité actuelle** et **d'optimiser leurs investissements** en stations de mobilité partagée.
> 
> Merci ! Des questions ?"

---

## 💡 Bonus : Réponses aux Questions Fréquentes

### Q1 : "Pourquoi Leaflet et pas Mapbox ou Google Maps ?"

> "J'ai choisi Leaflet car :
> - ✅ Open-source et gratuit (pas de limitation API)
> - ✅ Support natif GeoJSON (standard international)
> - ✅ Léger et performant
> - ✅ Grande communauté et documentation
> - ✅ Compatible avec OpenStreetMap (données ouvertes)
> 
> Mapbox et Google Maps nécessitent des clés API payantes et ont des quotas."

### Q2 : "Pourquoi uniquement Bordeaux ?"

> "Nous avons choisi Bordeaux Métropole comme cas d'étude pour le hackathon car :
> - ✅ Données complètes disponibles (6 644 carreaux, 5 810 stations)
> - ✅ Résultats quantifiables et concrets
> - ✅ Démonstration claire de l'impact (107k habitants desservis avec 1M€)
> - ✅ L'architecture est extensible : il suffit d'ajouter les données d'autres villes dans le backend pour les supporter
> 
> C'est plus réaliste et convaincant qu'une démo générique sur toute la France."

### Q3 : "Comment avez-vous géré la compatibilité GeoJSON ?"

> "Leaflet supporte GeoJSON nativement, j'ai juste créé un composant `GeoJSONLayer` qui :
> - Prend les données GeoJSON du backend
> - Les affiche sur la carte avec colorisation selon le score
> - Gère les interactions (hover, clic, popup)
> 
> Le format est standardisé (RFC 7946), donc aucune conversion nécessaire. J'ai documenté les 3 points critiques pour le backend dans `API_CONTRACT_VALIDATION.md`."

### Q4 : "Et si le backend n'est pas prêt pour la démo ?"

> "J'ai prévu des **données de démonstration** (mock data) qui permettent de :
> - ✅ Naviguer dans toute l'interface
> - ✅ Voir tous les composants fonctionnels
> - ✅ Tester les interactions (filtres, clics, formulaires)
> 
> La démo reste possible même sans backend. Dès que l'API est disponible, on change juste l'URL dans `.env.local` et tout bascule sur les vraies données automatiquement."

### Q5 : "Combien de temps vous a pris le développement ?"

> "Le workflow automatisé a généré toute la structure en ~15 minutes :
> - Architecture complète
> - 25+ composants
> - 3 pages
> - Service API
> - Types TypeScript
> 
> J'ai ensuite passé ~2-3 heures à :
> - Adapter pour Bordeaux
> - Créer la documentation d'intégration API
> - Valider le contrat avec le backend
> - Tester l'interface
> 
> Total : ~3-4 heures pour un frontend professionnel complet."

---

## 🎬 Conseils pour la Présentation

### Avant de Commencer :
- ✅ Ouvrir l'interface dans le navigateur (`npm run dev`)
- ✅ Avoir les 3 pages ouvertes dans 3 onglets
- ✅ Préparer la démo : carte avec marqueurs visibles, recommandations calculées
- ✅ Nettoyer l'écran (fermer Slack, emails, etc.)

### Pendant la Présentation :
- 🎯 Montrer l'interface en **action** (pas juste des slides)
- 🎯 Cliquer sur les éléments interactifs (marqueurs, filtres)
- 🎯 Mentionner les **chiffres concrets** (6 644 carreaux, 107k habitants)
- 🎯 Parler des **choix techniques** justifiés (pourquoi Leaflet, TypeScript, etc.)
- 🎯 Relier au **problème réel** : aider Citiz à optimiser ses investissements

### Après la Présentation :
- ✅ Partager les liens vers la documentation (GitHub)
- ✅ Proposer une démo individuelle si le jury veut approfondir
- ✅ Rester disponible pour questions techniques

---

**Bon courage pour votre présentation ! Vous avez un frontend solide et professionnel.** 🚀
