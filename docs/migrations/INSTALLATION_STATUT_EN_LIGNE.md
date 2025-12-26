# Guide d'Installation - Système de Statut En Ligne

## 📋 Prérequis
- PostgreSQL en cours d'exécution
- Accès à la base de données Velosi
- Node.js backend arrêté (recommandé)

## 🚀 Installation Rapide

### Étape 1 : Exécuter le Script SQL

**Option A : Via psql (Ligne de commande)**
```bash
# Connexion à PostgreSQL
psql -U postgres -d velosi_db

# Exécuter le script
\i C:/Users/MSP/Documents/Projet\ Velosi/ERP/velosi-back/migrations/add_statut_en_ligne_to_personnel.sql

# Vérifier que les colonnes ont bien été ajoutées
\d personnel
\d client

# Quitter psql
\q
```

**Option B : Via pgAdmin**
1. Ouvrez pgAdmin
2. Connectez-vous à votre serveur PostgreSQL
3. Sélectionnez la base de données `velosi_db`
4. Ouvrez le Query Tool (Outils > Query Tool)
5. Copiez-collez le contenu du fichier `add_statut_en_ligne_to_personnel.sql`
6. Exécutez le script (F5 ou bouton ▶)
7. Vérifiez qu'il n'y a pas d'erreurs

**Option C : Via DBeaver ou autre client**
1. Connectez-vous à votre base de données
2. Ouvrez un nouvel éditeur SQL
3. Chargez le fichier `migrations/add_statut_en_ligne_to_personnel.sql`
4. Exécutez le script

### Étape 2 : Vérifier la Migration

Exécutez cette requête pour vérifier que les colonnes existent :

```sql
-- Vérifier les colonnes pour la table personnel
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'personnel' 
AND column_name IN ('statut_en_ligne', 'last_activity');

-- Vérifier les colonnes pour la table client
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'client' 
AND column_name IN ('statut_en_ligne', 'last_activity');
```

**Résultat attendu :**
```
column_name      | data_type               | column_default
-----------------+-------------------------+----------------
statut_en_ligne  | boolean                 | false
last_activity    | timestamp without...    | NULL
```

### Étape 3 : Vérifier les Index

```sql
-- Vérifier les index créés
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('personnel', 'client') 
AND indexname LIKE '%statut_en_ligne%' OR indexname LIKE '%last_activity%';
```

### Étape 4 : Vérifier les Données

```sql
-- Vérifier que tous les utilisateurs sont initialisés comme hors ligne
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN statut_en_ligne = false THEN 1 ELSE 0 END) as hors_ligne,
  SUM(CASE WHEN statut_en_ligne = true THEN 1 ELSE 0 END) as en_ligne
FROM personnel;

SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN statut_en_ligne = false THEN 1 ELSE 0 END) as hors_ligne,
  SUM(CASE WHEN statut_en_ligne = true THEN 1 ELSE 0 END) as en_ligne
FROM client;
```

### Étape 5 : Démarrer le Backend

```bash
cd C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
npm run start:dev
```

**Vérifiez dans les logs :**
- ✅ Aucune erreur de synchronisation TypeORM
- ✅ Le serveur démarre correctement
- ✅ Pas d'erreur sur les entités Personnel et Client

### Étape 6 : Tester le Système

1. **Connexion d'un utilisateur**
   - Connectez-vous avec un compte personnel ou client
   - Vérifiez dans la base que `statut_en_ligne` passe à `true`
   - Vérifiez que `last_activity` est mis à jour

2. **Déconnexion**
   - Déconnectez-vous
   - Vérifiez que `statut_en_ligne` passe à `false`

3. **Affichage Frontend**
   - Ouvrez la page de gestion du personnel
   - Vérifiez la colonne "Connexion" avec les badges vert/gris
   - Ouvrez le modal de détails d'un personnel
   - Vérifiez le badge dans le header du modal

## 🔍 Requêtes de Diagnostic

### Voir tous les utilisateurs en ligne actuellement

```sql
-- Personnel en ligne
SELECT id, nom, prenom, nom_utilisateur, statut_en_ligne, last_activity
FROM personnel
WHERE statut_en_ligne = true
ORDER BY last_activity DESC;

-- Clients en ligne
SELECT id, nom, interlocuteur, statut_en_ligne, last_activity
FROM client
WHERE statut_en_ligne = true
ORDER BY last_activity DESC;
```

### Voir l'activité récente (dernières 2 heures)

```sql
SELECT 
  id,
  nom,
  prenom,
  nom_utilisateur,
  statut_en_ligne,
  last_activity,
  EXTRACT(EPOCH FROM (NOW() - last_activity))/60 as minutes_inactif
FROM personnel
WHERE last_activity > NOW() - INTERVAL '2 hours'
ORDER BY last_activity DESC;
```

### Trouver les sessions expirées (>24h)

```sql
SELECT 
  id,
  nom,
  prenom,
  statut_en_ligne,
  last_activity,
  EXTRACT(EPOCH FROM (NOW() - last_activity))/3600 as heures_inactif
FROM personnel
WHERE statut_en_ligne = true 
  AND last_activity < NOW() - INTERVAL '24 hours';
```

## 🛠️ Résolution de Problèmes

### Erreur : "Column already exists"

Si vous réexécutez le script, vous pourriez voir cette erreur. C'est normal grâce à `IF NOT EXISTS`. Ignorez-la.

### Erreur de synchronisation TypeORM

Si le backend affiche des erreurs au démarrage :

```bash
# Option 1 : Redémarrer le serveur
Ctrl+C
npm run start:dev

# Option 2 : Nettoyer et rebuilder
npm run build
npm run start:dev
```

### Les champs ne s'affichent pas dans le frontend

1. Videz le cache du navigateur (Ctrl+Shift+R)
2. Vérifiez que le backend retourne bien les champs :
   ```bash
   # Dans la console navigateur
   fetch('http://localhost:3000/api/personnel/all')
     .then(r => r.json())
     .then(d => console.log(d.data[0]))
   ```
3. Vérifiez les logs du frontend dans la console

### Réinitialiser tous les statuts

Si besoin de remettre tous les utilisateurs hors ligne :

```sql
UPDATE personnel SET statut_en_ligne = false;
UPDATE client SET statut_en_ligne = false;
```

## ✅ Checklist Post-Installation

- [ ] Migration SQL exécutée sans erreur
- [ ] Colonnes visibles dans la structure de la base
- [ ] Index créés
- [ ] Backend démarre sans erreur TypeORM
- [ ] Connexion utilisateur met `statut_en_ligne` à `true`
- [ ] Déconnexion met `statut_en_ligne` à `false`
- [ ] Colonne "Connexion" visible dans le tableau personnel
- [ ] Badge dans le header du modal de détails
- [ ] Carte Leaflet affiche correctement les statuts en ligne
- [ ] `last_activity` se met à jour automatiquement

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs du backend
2. Vérifiez les logs du frontend (Console navigateur)
3. Consultez `docs/GESTION_STATUT_EN_LIGNE.md` pour plus de détails
