# 📥 Guide d'Importation des Données depuis les APIs

Ce guide explique comment remplir vos tables avec des données essentielles depuis les APIs internationales.

## 🎯 Qu'est-ce que ce script fait ?

Le script `data_importer.py` récupère automatiquement des données **nettoyées et validées** depuis des APIs publiques et remplit vos 4 tables :

- ✅ **Ports maritimes** → ~100-200 ports majeurs mondiaux
- ✅ **Aéroports** → ~200-300 aéroports principaux
- ✅ **Armateurs** → 20 compagnies maritimes majeures
- ✅ **Navires** → 7 navires iconiques (exemples réels)

## 🚀 Commandes d'utilisation

### 1️⃣ Importer TOUTES les données essentielles

```powershell
python data_importer.py --db-password "VOTRE_MOT_DE_PASSE"
```

**Résultat attendu :**
- ~200 ports maritimes importés
- ~250 aéroports importés
- 20 armateurs importés
- 7 navires importés

**Durée estimée :** 5-10 minutes

---

### 2️⃣ Importer une entité spécifique

**Ports uniquement :**
```powershell
python data_importer.py --entity ports --db-password "VOTRE_MOT_DE_PASSE"
```

**Aéroports uniquement :**
```powershell
python data_importer.py --entity aeroports --db-password "VOTRE_MOT_DE_PASSE"
```

**Armateurs uniquement :**
```powershell
python data_importer.py --entity armateurs --db-password "VOTRE_MOT_DE_PASSE"
```

**Navires uniquement :**
```powershell
python data_importer.py --entity navires --db-password "VOTRE_MOT_DE_PASSE"
```

---

## 📊 Ce qui est importé

### 🚢 Ports Maritimes (via OpenDataSoft - World Port Index)

**Régions couvertes :**
- France (Marseille, Le Havre, Dunkerque, etc.)
- Espagne (Barcelone, Valence, Algésiras, etc.)
- Italie (Gênes, Naples, Venise, etc.)
- Maroc (Casablanca, Tanger Med, etc.)
- Algérie (Alger, Oran, etc.)
- Tunisie (Tunis, Sfax, etc.)
- Europe du Nord (Rotterdam, Anvers, Hambourg, etc.)
- Méditerranée

**Données importées :**
- Nom du port (nettoyé)
- Code/abréviation unique
- Ville
- Pays (en français)

**Exemple :**
```
Libelle: Marseille-Fos-sur-Mer
Abbreviation: FRMRS
Ville: Marseille
Pays: France
```

---

### ✈️ Aéroports (via OpenDataSoft - Airports Code)

**Pays couverts :**
- FR (France) - CDG, ORY, NCE, LYS, MRS, etc.
- ES (Espagne) - MAD, BCN, AGP, etc.
- IT (Italie) - FCO, MXP, VCE, etc.
- MA (Maroc) - CMN, RAK, etc.
- DZ (Algérie) - ALG, ORN, etc.
- TN (Tunisie) - TUN, DJE, etc.
- DE (Allemagne) - FRA, MUC, BER, etc.
- GB (Royaume-Uni) - LHR, LGW, MAN, etc.

**Données importées :**
- Nom de l'aéroport (nettoyé)
- Code IATA (3 lettres, validé)
- Ville
- Pays (en français)

**Exemple :**
```
Libelle: Paris-Charles de Gaulle Aéroport
Abbreviation: CDG
Ville: Paris
Pays: France
```

---

### 🏢 Armateurs (20 compagnies majeures)

**Liste des armateurs importés :**

1. **CMA CGM** (France) - 3ème mondial
2. **MSC Mediterranean Shipping Company** (Suisse) - 1er mondial
3. **Maersk Line** (Danemark) - 2ème mondial
4. **COSCO Shipping Lines** (Chine) - 4ème mondial
5. **Hapag-Lloyd** (Allemagne) - 5ème mondial
6. **ONE Ocean Network Express** (Japon)
7. **Evergreen Line** (Taïwan)
8. **Yang Ming Marine Transport** (Taïwan)
9. **HMM Hyundai Merchant Marine** (Corée du Sud)
10. **PIL Pacific International Lines** (Singapour)
11. **Zim Integrated Shipping Services** (Israël)
12. **Wan Hai Lines** (Taïwan)
13. **OOCL Orient Overseas Container Line** (Hong Kong)
14. **Compagnie Maritime Nantaise** (France)
15. **Louis Dreyfus Armateurs** (France)
16. **Marfret** (France)
17. **Arkas Line** (Turquie)
18. **Grimaldi Lines** (Italie)
19. **Contship Italia** (Italie)
20. **COMANAV** (Maroc)

**Données importées :**
- Code unique
- Nom complet
- Abréviation (générée automatiquement)
- Pays
- Site web officiel

**Exemple :**
```
Code: CMACGM
Nom: CMA CGM
Abreviation: CC
Pays: France
Site: https://www.cma-cgm.com
```

---

### ⛴️ Navires (7 navires iconiques)

**Navires importés (exemples réels) :**

1. **CMA CGM ANTOINE DE SAINT EXUPERY** (CMA CGM)
   - Code IMO: IMO9454436
   - Longueur: 400m, Jauge: 187,625 GT
   
2. **MSC GULSUN** (MSC) - Un des plus grands porte-conteneurs
   - Code IMO: IMO9839432
   - Longueur: 399.9m, Jauge: 232,618 GT
   
3. **MADRID MAERSK** (Maersk)
   - Code IMO: IMO9778150
   - Longueur: 399m, Jauge: 214,286 GT
   
4. **COSCO SHIPPING UNIVERSE** (COSCO)
   - Code IMO: IMO9795668
   - Longueur: 400m, Jauge: 199,685 GT
   
5. **SAJIR** (Hapag-Lloyd)
   - Code IMO: IMO9837865
   - Longueur: 399.9m, Jauge: 192,496 GT
   
6. **ONE INNOVATION** (ONE)
   - Code IMO: IMO9875726
   - Longueur: 400m, Jauge: 215,542 GT
   
7. **EVER GIVEN** (Evergreen) - Célèbre pour avoir bloqué le canal de Suez
   - Code IMO: IMO9811000
   - Longueur: 399.94m, Jauge: 219,079 GT

**Données importées :**
- Code unique
- Nom du navire
- Nationalité et pavillon
- Dimensions (longueur, largeur)
- Jauge brute
- Code IMO (validé)
- Lien avec l'armateur

---

## ⚙️ Configuration avancée

### Personnaliser les régions de ports

Modifier dans `data_importer.py`, ligne ~126 :

```python
regions = [
    'France', 'Spain', 'Italy',  # Ajouter vos régions
    'Morocco', 'West Africa',    # Personnaliser
]
```

### Personnaliser les pays d'aéroports

Modifier ligne ~230 :

```python
country_codes = [
    'FR', 'ES', 'IT',  # Codes ISO pays
    'US', 'CN', 'JP',  # Ajouter d'autres
]
```

### Ajouter plus d'armateurs

Modifier ligne ~334 :

```python
major_companies = [
    {'nom': 'Votre Compagnie', 'pays': 'Pays', 'site': 'https://...'},
    # Ajouter vos armateurs
]
```

---

## 🔍 Vérification des données importées

### Vérifier les ports
```sql
SELECT COUNT(*) as total, pays, COUNT(*) as count 
FROM ports 
GROUP BY pays 
ORDER BY count DESC;
```

### Vérifier les aéroports
```sql
SELECT COUNT(*) as total, pays, COUNT(*) as count 
FROM aeroports 
GROUP BY pays 
ORDER BY count DESC;
```

### Vérifier les armateurs
```sql
SELECT nom, pays, siteweb 
FROM armateurs 
ORDER BY nom;
```

### Vérifier les navires avec leurs armateurs
```sql
SELECT n.libelle, n.code_omi, a.nom as armateur 
FROM navires n 
JOIN armateurs a ON n.armateur_id = a.id 
ORDER BY n.libelle;
```

---

## 🛡️ Sécurité et validation

### Ce que fait le script automatiquement :

✅ **Vérification des doublons** - Ne réimporte pas les données existantes
✅ **Validation des codes** - IATA (3 lettres), IMO (format standard)
✅ **Normalisation** - Noms en français, pays standardisés
✅ **Nettoyage** - Enlève les caractères spéciaux, formate les URLs
✅ **Gestion des erreurs** - Continue même si une entrée échoue
✅ **Transactions** - Rollback automatique en cas d'erreur

---

## 📈 Exemple de sortie

```
================================================================================
🚀 IMPORTATION COMPLÈTE DES DONNÉES VELOSI
================================================================================

================================================================================
🏢 IMPORTATION DES ARMATEURS
================================================================================
  ✅ Armateur ajouté: CMA CGM (CC)
  ✅ Armateur ajouté: MSC Mediterranean Shipping Company (MMSSC)
  ✅ Armateur ajouté: Maersk Line (ML)
  ...
✅ Armateurs importés: 20, ignorés: 0

================================================================================
⛴️ IMPORTATION DES NAVIRES
================================================================================
  ✅ Navire ajouté: CMA CGM ANTOINE DE SAINT EXUPERY (IMO9454436)
  ✅ Navire ajouté: MSC GULSUN (IMO9839432)
  ...
✅ Navires importés: 7, ignorés: 0

================================================================================
🚢 IMPORTATION DES PORTS MARITIMES
================================================================================
📍 Recherche des ports: France
  ✅ Port ajouté: Marseille-Fos-sur-Mer (FRMRS)
  ✅ Port ajouté: Le Havre (FRLFH)
  ...
✅ Ports importés: 156, ignorés: 12

================================================================================
✈️ IMPORTATION DES AÉROPORTS
================================================================================
📍 Recherche des aéroports: FR
  ✅ Aéroport ajouté: Paris-Charles de Gaulle Aéroport (CDG)
  ✅ Aéroport ajouté: Paris-Orly Aéroport (ORY)
  ...
✅ Aéroports importés: 245, ignorés: 8

================================================================================
📊 RÉSUMÉ DE L'IMPORTATION
================================================================================
⏱️ Durée totale: 0:08:34

📋 Statistiques par entité:
  Armateurs:
    ✅ Importés: 20
    ⏭️ Ignorés: 0
    ❌ Erreurs: 0
  Navires:
    ✅ Importés: 7
    ⏭️ Ignorés: 0
    ❌ Erreurs: 0
  Ports:
    ✅ Importés: 156
    ⏭️ Ignorés: 12
    ❌ Erreurs: 2
  Aeroports:
    ✅ Importés: 245
    ⏭️ Ignorés: 8
    ❌ Erreurs: 1

📊 Total général:
  ✅ 428 entrées importées
  ⏭️ 20 entrées ignorées (déjà existantes)
  ❌ 3 erreurs
================================================================================
```

---

## 🔄 Ré-exécution

Le script est **idempotent** : vous pouvez le ré-exécuter sans problème.

- Les entrées existantes sont **ignorées** (pas de doublons)
- Seules les nouvelles données sont ajoutées
- Aucun risque de corruption des données

---

## ⚠️ Notes importantes

1. **Sauvegarde recommandée** avant la première exécution :
   ```powershell
   pg_dump -U postgres -d velosi > backup_avant_import.sql
   ```

2. **Les APIs publiques** ont des limites de taux :
   - Le script respecte un délai de 0.5s entre requêtes
   - Pas de clé API nécessaire pour les données de base

3. **Codes IMO des navires** sont des exemples réels et validés

4. **Personnalisation** : Modifiez les listes dans le code pour vos besoins spécifiques

---

## 📞 Différence avec le système de nettoyage

| Fonctionnalité | `data_importer.py` | `main_cleaner.py` |
|----------------|-------------------|-------------------|
| **But** | Importer de nouvelles données | Nettoyer données existantes |
| **Source** | APIs internationales | Votre base de données |
| **Action** | INSERT | UPDATE |
| **Quand l'utiliser** | Tables vides ou peu remplies | Tables avec données brutes |

**Workflow recommandé :**
1. Exécuter `data_importer.py` pour remplir les tables
2. Exécuter `main_cleaner.py` pour nettoyer et enrichir

---

Prêt à remplir vos tables ! 🚀
