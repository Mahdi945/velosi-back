# 🧹 Système de Nettoyage et Enrichissement des Données Velosi

Système complet de nettoyage et d'enrichissement des données pour les 4 entités principales du système de transport et logistique Velosi.

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Entités traitées](#entités-traitées)
- [APIs utilisées](#apis-utilisées)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Structure du projet](#structure-du-projet)
- [Exemples](#exemples)

## 🎯 Vue d'ensemble

Ce système permet de :
- ✅ Nettoyer et normaliser les données existantes
- 🌍 Enrichir les données avec des APIs internationales publiques
- 📊 Valider l'intégrité des données
- 📈 Générer des rapports statistiques
- ➕ Ajouter de nouvelles entrées depuis des sources externes

## 🚢 Entités traitées

### 1. **Ports Maritimes**
- Normalisation des noms en français
- Validation des codes/abréviations
- Enrichissement via OpenDataSoft (World Port Index)
- Ajout de coordonnées géographiques

### 2. **Aéroports** ✈️
- Validation des codes IATA (3 lettres)
- Normalisation des noms
- Enrichissement via OpenDataSoft et AviationStack
- Codes ICAO additionnels

### 3. **Armateurs** 🏢
- Normalisation des coordonnées (téléphone, email, site web)
- Validation des codes postaux
- Génération d'abréviations
- Enrichissement via Wikidata
- Validation de l'intégrité (doublons, formats)

### 4. **Navires** ⛴️
- Validation des codes IMO (avec algorithme de vérification)
- Normalisation des pavillons
- Calcul de métriques (DWT estimé, ratios)
- Classification par taille
- Rapport statistiques détaillé

## 🌐 APIs utilisées

### APIs Gratuites (sans clé requise)
- **OpenDataSoft** - Ports et aéroports mondiaux
- **Wikidata** - Informations sur les compagnies maritimes

### APIs Payantes/Limitées (optionnelles)
- **AviationStack** - Données détaillées sur les aéroports
- **VesselFinder** - Informations sur les navires (à implémenter)
- **MarineTraffic** - Tracking et données navires (à implémenter)

## 📦 Installation

### Prérequis
- Python 3.8+
- PostgreSQL 12+
- Accès à la base de données Velosi

### Étapes

1. **Cloner ou naviguer vers le dossier**
```powershell
cd "c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\scripts\data-cleaning"
```

2. **Créer un environnement virtuel (recommandé)**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

3. **Installer les dépendances**
```powershell
pip install -r requirements.txt
```

## ⚙️ Configuration

### 1. Variables d'environnement

Créer un fichier `.env` dans le dossier `data-cleaning` :

```env
# Configuration Base de Données
DB_HOST=localhost
DB_NAME=velosi
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
DB_PORT=5432

# Clés API (optionnelles)
AVIATION_API_KEY=votre_cle_aviationstack
```

### 2. Configuration directe dans les scripts

Alternativement, modifier directement la configuration dans `main_cleaner.py` :

```python
db_config = {
    'host': 'localhost',
    'database': 'velosi',
    'user': 'postgres',
    'password': 'votre_mot_de_passe',
    'port': 5432
}
```

## 🚀 Utilisation

### Mode 1 : Nettoyage complet de toutes les entités

```powershell
python main_cleaner.py --db-password "votre_mot_de_passe"
```

### Mode 2 : Nettoyer une entité spécifique

**Ports uniquement :**
```powershell
python main_cleaner.py --entity ports --db-password "votre_mot_de_passe"
```

**Aéroports uniquement :**
```powershell
python main_cleaner.py --entity aeroports --db-password "votre_mot_de_passe"
```

**Armateurs uniquement :**
```powershell
python main_cleaner.py --entity armateurs --db-password "votre_mot_de_passe"
```

**Navires uniquement :**
```powershell
python main_cleaner.py --entity navires --db-password "votre_mot_de_passe"
```

### Mode 3 : Ajouter de nouvelles entrées

```powershell
python main_cleaner.py --entity ports --add-new --db-password "votre_mot_de_passe"
```

### Mode 4 : Configuration personnalisée de la base de données

```powershell
python main_cleaner.py `
  --db-host "production-server.com" `
  --db-name "velosi_prod" `
  --db-user "admin" `
  --db-password "mot_de_passe_securise" `
  --db-port 5432 `
  --entity all
```

### Mode 5 : Exécution de scripts individuels

Chaque script peut être exécuté indépendamment :

```powershell
# Nettoyer les ports
python ports_cleaner.py

# Nettoyer les aéroports
python aeroports_cleaner.py

# Nettoyer les armateurs
python armateurs_cleaner.py

# Nettoyer les navires
python navires_cleaner.py
```

## 📁 Structure du projet

```
data-cleaning/
│
├── main_cleaner.py              # Script principal d'orchestration
├── ports_cleaner.py             # Nettoyage des ports maritimes
├── aeroports_cleaner.py         # Nettoyage des aéroports
├── armateurs_cleaner.py         # Nettoyage des armateurs
├── navires_cleaner.py           # Nettoyage des navires
│
├── requirements.txt             # Dépendances Python
├── README.md                    # Cette documentation
├── .env                         # Configuration (à créer)
│
└── logs/                        # Logs générés (créé automatiquement)
    └── data_cleaning_YYYYMMDD_HHMMSS.log
```

## 📊 Fonctionnalités détaillées

### Ports (`ports_cleaner.py`)

**Nettoyage effectué :**
- ✅ Recherche dans World Port Index
- ✅ Normalisation des noms de pays en français
- ✅ Validation des codes/abréviations
- ✅ Ajout de coordonnées GPS

**API utilisée :** OpenDataSoft - World Port Index

**Exemple de résultat :**
```
Avant : "Marseille Fos" (code manquant)
Après : "Marseille-Fos-sur-Mer" (code: FRMRS, GPS: 43.3623°N, 4.9487°E)
```

### Aéroports (`aeroports_cleaner.py`)

**Nettoyage effectué :**
- ✅ Validation des codes IATA (3 lettres)
- ✅ Normalisation des noms (enlever "Airport", ajouter "Aéroport")
- ✅ Codes ICAO (4 lettres)
- ✅ Pays en français

**APIs utilisées :**
- OpenDataSoft - Airports Code
- AviationStack (si clé API fournie)

**Exemple de résultat :**
```
Avant : "Paris CDG (CDG)" 
Après : "Paris-Charles de Gaulle Aéroport" (IATA: CDG, ICAO: LFPG)
```

### Armateurs (`armateurs_cleaner.py`)

**Nettoyage effectué :**
- ✅ Normalisation téléphone (+33 pour France)
- ✅ Validation email (format RFC)
- ✅ Normalisation URL (https://)
- ✅ Codes postaux (5 chiffres pour France)
- ✅ Génération d'abréviations
- ✅ Enrichissement Wikidata
- ✅ Détection des doublons

**API utilisée :** Wikidata

**Exemple de résultat :**
```
Avant : 
  Tel: "01 23 45 67 89"
  Email: "CONTACT@CMA-CGM.COM"
  Web: "cma-cgm.com"

Après :
  Tel: "+33 1 23 45 67 89"
  Email: "contact@cma-cgm.com"
  Web: "https://www.cma-cgm.com"
```

### Navires (`navires_cleaner.py`)

**Nettoyage effectué :**
- ✅ Validation code IMO (algorithme checksum)
- ✅ Format IMO standard (IMO1234567)
- ✅ Normalisation pavillon
- ✅ Nom en majuscules (convention maritime)
- ✅ Calcul DWT estimé
- ✅ Ratio longueur/largeur
- ✅ Classification par taille
- ✅ Rapport statistique complet

**Validation IMO :**
Le système utilise l'algorithme officiel de l'IMO pour valider les numéros.

**Exemple de résultat :**
```
Avant :
  Code IMO: "9234567" (non validé)
  Pavillon: "FR"
  Jauge: 50000

Après :
  Code IMO: "IMO9234567" (✅ validé)
  Pavillon: "France"
  Jauge: 50000 GT
  Notes: "Catégorie: Grand navire | DWT estimé: 75000 tonnes | Ratio L/l: 6.5"
```

## 📈 Logs et Rapports

### Logs automatiques

Chaque exécution génère un fichier log :
```
data_cleaning_20250120_143022.log
```

### Format des logs
```
2025-01-20 14:30:22 - INFO - ✅ Connexion à la base de données établie
2025-01-20 14:30:23 - INFO - 📊 156 ports récupérés
2025-01-20 14:30:24 - INFO - 🔧 Traitement du port ID 1: Marseille
2025-01-20 14:30:25 - INFO - ✅ Port enrichi: Marseille-Fos-sur-Mer
```

### Rapport final

À la fin de l'exécution :
```
================================================================================
📊 RÉSUMÉ DU NETTOYAGE
================================================================================
⏱️ Durée totale: 0:15:32

📋 Entités traitées:
  ✅ Armateurs: success
  ✅ Navires: success
  ✅ Ports: success
  ✅ Aéroports: success

✅ Aucune erreur rencontrée
================================================================================
```

## 🔍 Exemples d'utilisation avancés

### 1. Nettoyer uniquement les données avec validation stricte

```python
from armateurs_cleaner import ArmateursCleaner

db_config = {
    'host': 'localhost',
    'database': 'velosi',
    'user': 'postgres',
    'password': 'password',
    'port': 5432
}

cleaner = ArmateursCleaner(db_config)
cleaner.process_all_armateurs()
cleaner.validate_data_integrity()  # Rapport de validation
```

### 2. Ajouter des ports pour une région spécifique

```python
from ports_cleaner import PortsCleaner

cleaner = PortsCleaner(db_config)
cleaner.add_new_ports_from_api(['Mediterranean', 'North Africa', 'West Africa'])
```

### 3. Générer un rapport sur les navires

```python
from navires_cleaner import NaviresCleaner

cleaner = NaviresCleaner(db_config)
cleaner.generate_statistics_report()
```

## ⚠️ Limitations et Notes

### APIs gratuites
- **OpenDataSoft** : Pas de limite stricte, mais respecter un délai entre requêtes (0.5s implémenté)
- **Wikidata** : Données parfois incomplètes pour les petites compagnies

### APIs payantes
- **AviationStack** : Plan gratuit limité à 100 requêtes/mois
- **VesselFinder/MarineTraffic** : Structure préparée, mais nécessite abonnement

### Validation
- Les codes IMO sont validés avec l'algorithme officiel
- Les emails sont validés selon RFC 5322
- Les numéros de téléphone français sont normalisés au format international

## 🛠️ Dépannage

### Erreur de connexion à la base de données
```
❌ Erreur de connexion à la base de données: FATAL: password authentication failed
```
**Solution :** Vérifier les identifiants dans `.env` ou les arguments de ligne de commande.

### Import manquant
```
ModuleNotFoundError: No module named 'pandas'
```
**Solution :** Installer les dépendances : `pip install -r requirements.txt`

### Timeout API
```
⚠️ Erreur API pour Marseille: Read timed out
```
**Solution :** Augmenter le timeout dans les scripts (timeout=10 → timeout=20)

### Trop de requêtes API
```
Rate limit exceeded
```
**Solution :** Augmenter le délai entre requêtes (`time.sleep(0.5)` → `time.sleep(1)`)

## 🔄 Maintenance et Mises à jour

### Ajouter une nouvelle API

1. Créer une méthode de recherche dans le cleaner approprié
2. Ajouter la gestion de la clé API dans `main_cleaner.py`
3. Mettre à jour `.env.example` avec la nouvelle clé
4. Documenter dans ce README

### Mettre à jour les mappings de pays

Éditer les dictionnaires `country_mapping` dans chaque cleaner.

## 📞 Support

Pour toute question ou problème :
- Consulter les logs générés
- Vérifier la configuration de la base de données
- S'assurer que les tables existent avec les bonnes colonnes

## 📝 Licence

Système propriétaire - Velosi Transport & Logistique

---

**Version :** 1.0.0  
**Date :** Novembre 2025  
**Auteur :** Équipe Technique Velosi
