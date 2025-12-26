# 🚀 GUIDE D'EXÉCUTION - MIGRATION VERS SHIPNOLOGY (SAAS MULTI-TENANT)

## 📋 PRÉREQUIS

- PostgreSQL installé et en cours d'exécution
- Accès administrateur PostgreSQL (user: postgres)
- Base de données actuelle : `velosi`
- **IMPORTANT** : Faire un backup avant toute manipulation !

---

## 🔄 ÉTAPE 1 : BACKUP DE SÉCURITÉ (OBLIGATOIRE)

Avant toute migration, sauvegardez votre base actuelle :

```powershell
# Windows PowerShell
pg_dump -U postgres velosi > backup_velosi_$(Get-Date -Format 'yyyy-MM-dd_HH-mm').sql
```

Ou en ligne de commande classique :
```bash
pg_dump -U postgres velosi > backup_velosi_2025-12-17.sql
```

---

## 📊 ÉTAPE 2 : CRÉER LA BASE PRINCIPALE "shipnology"

Cette base contiendra la liste de toutes vos organisations (clients).

### Méthode 1 : Via psql (Recommandé)

```powershell
# Se connecter à PostgreSQL
psql -U postgres

# Exécuter le script
\i 'C:/Users/MSP/Documents/Projet Velosi/ERP/velosi-back/migrations/000_create_velosi_main_database.sql'

# Vérifier la création
\c shipnology
\dt
```

### Méthode 2 : Depuis PowerShell

```powershell
psql -U postgres -f "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\migrations\000_create_velosi_main_database.sql"
```

### ✅ Vérification

Vous devriez voir :
- Base de données `shipnology` créée
- Tables : `organisations`, `setup_tokens`
- Fonctions : `generate_database_name()`, `generate_setup_token()`

---

## 🔁 ÉTAPE 3 : MIGRER "velosi" VERS "shipnology_velosi"

Cette étape transforme votre base actuelle en première organisation cliente.

### A) Créer la nouvelle base

```powershell
psql -U postgres -c "CREATE DATABASE shipnology_velosi;"
```

### B) Copier toutes les données

```powershell
# Dump de velosi et restauration dans shipnology_velosi
pg_dump -U postgres velosi | psql -U postgres shipnology_velosi
```

### C) Enregistrer Velosi dans la table organisations

```powershell
psql -U postgres -f "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\migrations\001_migrate_velosi_to_shipnology.sql"
```

**IMPORTANT** : Avant d'exécuter ce script, éditez-le pour mettre à jour :
- L'email de contact Velosi
- Le numéro de téléphone

### ✅ Vérification

```sql
-- Se connecter à shipnology
psql -U postgres -d shipnology

-- Vérifier les organisations
SELECT id, nom, database_name, statut FROM organisations;

-- Résultat attendu :
-- id |                  nom                   |    database_name     | statut 
-- ----+----------------------------------------+----------------------+--------
--  0 | MSP - Management System Productivity   | shipnology_msp       | actif
--  1 | Velosi                                 | shipnology_velosi    | actif
```

```sql
-- Vérifier que shipnology_velosi contient les données
psql -U postgres -d shipnology_velosi

SELECT 
  (SELECT COUNT(*) FROM personnel) as nb_personnel,
  (SELECT COUNT(*) FROM clients) as nb_clients,
  (SELECT COUNT(*) FROM prospects) as nb_prospects,
  (SELECT COUNT(*) FROM devis) as nb_devis;
```

---

## ⚙️ ÉTAPE 4 : CONFIGURER LE BACKEND

### A) Fichier .env

Créez/modifiez le fichier `.env` dans `velosi-back` :

```env
# Base de données PRINCIPALE (registre des organisations)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=votre_mot_de_passe
DB_DATABASE=shipnology

# JWT
JWT_SECRET=votre_secret_jwt_très_sécurisé_changez_moi
JWT_EXPIRATION=24h

# Email (pour envoi des tokens)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre_mot_de_passe_app
SMTP_FROM=noreply@msp-erp.com

# URL Frontend
FRONTEND_URL=https://wyselogiquote.com
```

### B) TypeORM Configuration

Le backend devra maintenant :
1. Se connecter à `shipnology` pour lire les organisations
2. Se connecter dynamiquement aux bases clients (ex: `shipnology_velosi`)

---

## 🧪 ÉTAPE 5 : TESTS

### Test 1 : Connexion à shipnology

```sql
psql -U postgres -d shipnology
SELECT * FROM organisations;
```

### Test 2 : Connexion à shipnology_velosi

```sql
psql -U postgres -d shipnology_velosi
SELECT * FROM personnel LIMIT 5;
```

### Test 3 : Générer un token de test

```sql
psql -U postgres -d shipnology

INSERT INTO setup_tokens (token, email_destinataire, nom_contact, expires_at)
VALUES (
  'test_token_123456789',
  'test@example.com',
  'Test User',
  NOW() + INTERVAL '48 hours'
);

SELECT * FROM setup_tokens;
```

---

## 🗑️ ÉTAPE 6 : NETTOYAGE (APRÈS VALIDATION)

**ATTENTION** : Ne faites ceci qu'après avoir testé que tout fonctionne !

```sql
-- Supprimer l'ancienne base "velosi" (SEULEMENT SI TOUT FONCTIONNE)
DROP DATABASE velosi;
```

---

## 📝 RÉSUMÉ DE LA NOUVELLE ARCHITECTURE

```
📦 Serveur PostgreSQL
│
├── 🗂️ shipnology (Base PRINCIPALE - registre des organisations)
│   ├── organisations (liste de tous vos clients)
│   └── setup_tokens (tokens d'inscription)
│
├── 🗂️ shipnology_msp (Votre organisation MSP - optionnel)
│   └── (toutes les tables standard)
│
├── 🗂️ shipnology_velosi (Organisation cliente #1)
│   ├── personnel
│   ├── clients
│   ├── prospects
│   ├── devis
│   └── ... (toutes les autres tables)
│
└── 🗂️ shipnology_transport_rapide (Future organisation #2)
    └── ... (même structure)
```

---

## ❓ EN CAS DE PROBLÈME

### Erreur : "database already exists"
```sql
-- Supprimer la base si elle existe déjà
DROP DATABASE IF EXISTS shipnology;
-- Puis relancer le script
```

### Erreur : "relation already exists"
```sql
-- Se connecter à shipnology
\c shipnology
-- Supprimer les tables
DROP TABLE IF EXISTS setup_tokens CASCADE;
DROP TABLE IF EXISTS organisations CASCADE;
-- Puis relancer le script
```

### Restaurer le backup
```powershell
# Si quelque chose ne va pas, restaurez votre backup
psql -U postgres -d velosi < backup_velosi_2025-12-17.sql
```

---

## ✅ CHECKLIST FINALE

- [ ] Backup de `velosi` créé
- [ ] Base `shipnology` créée avec tables `organisations` et `setup_tokens`
- [ ] Base `shipnology_velosi` créée et données copiées
- [ ] Organisation Velosi enregistrée dans `shipnology.organisations`
- [ ] Fichier `.env` mis à jour avec `DB_DATABASE=shipnology`
- [ ] Tests de connexion réussis
- [ ] Backend configuré pour multi-tenant (prochaine étape)

---

## 🚀 PROCHAINES ÉTAPES

Une fois la migration terminée, vous devrez :

1. **Modifier le module Auth** pour rechercher les utilisateurs dans toutes les bases
2. **Créer le module Setup/Onboarding** pour l'inscription des nouveaux clients
3. **Créer l'interface Admin MSP** pour générer les tokens
4. **Implémenter les connexions dynamiques** aux bases clients

Ces étapes seront détaillées dans les prochains scripts.
