# 🚀 Guide de Migration des Utilisateurs vers Keycloak

## ✅ Améliorations Appliquées

### 1. Auth Service - Assignation Automatique des Rôles
- ✅ **Personnel** : Lors de la création, le rôle (commercial, administratif, chauffeur, exploitation, finance) est maintenant **automatiquement assigné dans Keycloak**
- ✅ **Client Permanent** : Lors de la création, le rôle **"client" est automatiquement assigné dans Keycloak**

### 2. Script de Migration
- ✅ Le script `sync-users-to-keycloak.ts` assigne correctement les rôles pour les utilisateurs existants
- ✅ Gestion des erreurs robuste avec logs détaillés
- ✅ Validation des emails avant création
- ✅ Détection automatique des utilisateurs déjà synchronisés

---

## 📋 Prérequis AVANT la Migration

### 1. Keycloak Configuré
Vous devez d'abord configurer Keycloak avec le script automatique :

```powershell
cd c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
.\configure-keycloak.ps1
```

**Ce script va :**
- ✅ Créer le realm `ERP_Velosi`
- ✅ Configurer les sessions (8h idle, 10h max)
- ✅ Créer le client `velosi_auth` avec le secret
- ✅ Créer les 6 rôles : commercial, administratif, chauffeur, exploitation, finance, client

**Résultat attendu :**
```
✅ Token obtenu avec succès
✅ Realm créé avec succès
✅ Client créé avec succès
✅ Rôle 'commercial' créé
✅ Rôle 'administratif' créé
✅ Rôle 'chauffeur' créé
✅ Rôle 'exploitation' créé
✅ Rôle 'finance' créé
✅ Rôle 'client' créé
📋 Configuration Terminée ✅
```

### 2. Vérifier la Configuration .env

Ouvrez le fichier `.env` et vérifiez :

```env
# PostgreSQL (Supabase)
DB_HOST=aws-0-eu-north-1.pooler.supabase.com
DB_PORT=5432
DB_USERNAME=postgres.aswqsbrpkofmhgqjmyuw
DB_PASSWORD=87Eq8384
DB_NAME=postgres

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=0SW8TshHXXdLEjpsBVCnQ4HvcSBbc2mN
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
```

### 3. Vérifier Keycloak Démarré

Ouvrez un navigateur et vérifiez que Keycloak est accessible :
```
http://localhost:8080/admin
Username: admin
Password: 87Eq8384
```

Vous devez voir le realm **ERP_Velosi** dans la liste.

### 4. Arrêter le Backend (si en cours d'exécution)

Si le backend NestJS tourne, arrêtez-le pour éviter les conflits de connexion à la base de données :
```powershell
# Appuyez sur Ctrl+C dans le terminal où npm run start:dev tourne
```

---

## 🔄 Exécution de la Migration

### Commande Principale

```powershell
cd c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
npm run sync:keycloak
```

### Sortie Attendue

```
🚀 Démarrage de la synchronisation avec Keycloak...

📋 SYNCHRONISATION DU PERSONNEL
══════════════════════════════════════════════════

Personnel actif trouvé : 15

🔄 Création de jean.dupont (commercial)...
   ✅ Créé avec succès - ID Keycloak: abc-123-def-456
🔄 Création de marie.martin (administratif)...
   ✅ Créé avec succès - ID Keycloak: ghi-789-jkl-012
⏭️  paul.bernard (finance) - Déjà synchronisé (mno-345-pqr-678)
⚠️  test.user - Email invalide ou manquant : "" - IGNORÉ

📋 SYNCHRONISATION DES CLIENTS PERMANENTS
══════════════════════════════════════════════════

Clients permanents actifs trouvés : 8

🔄 Création de ACME Corporation (client permanent)...
   ✅ Créé avec succès - ID Keycloak: stu-901-vwx-234
🔄 Création de TechSolutions SARL (client permanent)...
   ✅ Créé avec succès - ID Keycloak: yza-567-bcd-890
⏭️  Global Trading - Déjà synchronisé (efg-123-hij-456)

📊 RÉCAPITULATIF DE LA SYNCHRONISATION
══════════════════════════════════════════════════

✅ Personnel synchronisé : 12
⏭️  Personnel déjà synchronisé : 2

✅ Clients synchronisés : 6
⏭️  Clients déjà synchronisés : 1

❌ Erreurs totales : 1

✨ Total synchronisé : 18
══════════════════════════════════════════════════

🏁 Synchronisation terminée !
```

---

## ✅ Vérification Post-Migration

### 1. Vérifier dans Keycloak Admin Console

**Étape 1** : Ouvrir l'admin console
```
URL: http://localhost:8080/admin
Username: admin
Password: 87Eq8384
```

**Étape 2** : Sélectionner le realm `ERP_Velosi`

**Étape 3** : Aller dans "Users" → "View all users"

**Vérifications** :
- ✅ Tous les personnels actifs sont listés
- ✅ Tous les clients permanents actifs sont listés
- ✅ Clients temporaires **NE SONT PAS** listés (comportement correct)

**Étape 4** : Vérifier les rôles d'un utilisateur
1. Cliquer sur un utilisateur personnel (ex: jean.dupont)
2. Aller dans l'onglet "Role mapping"
3. Vérifier que le rôle approprié est assigné (commercial, administratif, etc.)

**Étape 5** : Vérifier les rôles d'un client
1. Cliquer sur un utilisateur client (ex: ACME Corporation)
2. Aller dans l'onglet "Role mapping"
3. Vérifier que le rôle **"client"** est assigné

### 2. Vérifier dans PostgreSQL (Supabase)

**Option 1** : Avec DBeaver/pgAdmin

Connectez-vous à Supabase :
```
Host: aws-0-eu-north-1.pooler.supabase.com
Port: 5432
User: postgres.aswqsbrpkofmhgqjmyuw
Password: 87Eq8384
Database: postgres
```

**Option 2** : Avec psql en ligne de commande

```bash
psql -h aws-0-eu-north-1.pooler.supabase.com -p 5432 -U postgres.aswqsbrpkofmhgqjmyuw -d postgres
# Password: 87Eq8384
```

**Requêtes de vérification** :

```sql
-- 1. Vérifier personnel synchronisé
SELECT 
  id,
  nom,
  prenom,
  nom_utilisateur,
  email,
  role,
  statut,
  keycloak_id,
  CASE 
    WHEN keycloak_id IS NOT NULL THEN '✅ Synchronisé'
    ELSE '❌ Non synchronisé'
  END as statut_sync
FROM personnel 
WHERE statut = 'actif'
ORDER BY id;

-- 2. Vérifier clients permanents synchronisés
SELECT 
  c.id,
  c.nom,
  c.statut,
  c.is_permanent,
  c.keycloak_id,
  cc.mail1 as email,
  CASE 
    WHEN c.keycloak_id IS NOT NULL THEN '✅ Synchronisé'
    ELSE '❌ Non synchronisé'
  END as statut_sync
FROM client c
LEFT JOIN contact_client cc ON cc.client_id = c.id
WHERE c.is_permanent = true AND c.statut = 'actif'
ORDER BY c.id;

-- 3. Statistiques de synchronisation
SELECT 
  'Personnel Actif' as type,
  COUNT(*) as total,
  COUNT(keycloak_id) as synchronises,
  COUNT(*) - COUNT(keycloak_id) as non_synchronises,
  ROUND(COUNT(keycloak_id)::numeric / COUNT(*)::numeric * 100, 2) as pourcentage
FROM personnel 
WHERE statut = 'actif'

UNION ALL

SELECT 
  'Client Permanent Actif' as type,
  COUNT(*) as total,
  COUNT(keycloak_id) as synchronises,
  COUNT(*) - COUNT(keycloak_id) as non_synchronises,
  ROUND(COUNT(keycloak_id)::numeric / COUNT(*)::numeric * 100, 2) as pourcentage
FROM client 
WHERE is_permanent = true AND statut = 'actif';
```

**Résultat attendu** :
```
type                      | total | synchronises | non_synchronises | pourcentage
--------------------------+-------+--------------+------------------+------------
Personnel Actif           |    15 |           15 |                0 |      100.00
Client Permanent Actif    |     8 |            8 |                0 |      100.00
```

### 3. Test d'Authentification (Optionnel)

Vous pouvez tester l'authentification d'un utilisateur migré :

```bash
# Test avec un personnel (remplacer jean.dupont par un username réel)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "jean.dupont",
    "password": "MotDePasseActuel"
  }'
```

**Note** : Les utilisateurs migrés **gardent leur mot de passe PostgreSQL actuel**. Le script ne définit PAS de nouveau mot de passe dans Keycloak (le champ `password` est `undefined`), donc l'authentification continue de fonctionner via PostgreSQL + synchronisation Keycloak.

---

## 🔧 Dépannage

### Erreur : "Cannot connect to Keycloak"
```
❌ Erreur lors de l'obtention du token: connect ECONNREFUSED 127.0.0.1:8080
```

**Solution** :
1. Vérifier que Keycloak est démarré : http://localhost:8080
2. Vérifier le fichier `.env` (KEYCLOAK_URL=http://localhost:8080)
3. Redémarrer Keycloak :
   ```powershell
   cd c:\keycloak-old\bin
   .\kc.bat start-dev
   ```

### Erreur : "Realm ERP_Velosi not found"
```
❌ Realm 'ERP_Velosi' introuvable
```

**Solution** :
1. Exécuter d'abord le script de configuration :
   ```powershell
   .\configure-keycloak.ps1
   ```
2. Vérifier dans l'admin console que le realm existe

### Erreur : "Role 'commercial' not found"
```
❌ Rôle 'commercial' introuvable dans Keycloak
```

**Solution** :
1. Exécuter le script de configuration qui crée les rôles :
   ```powershell
   .\configure-keycloak.ps1
   ```
2. Vérifier dans Keycloak Admin → Realm roles que les 6 rôles existent

### Avertissement : "Email invalide ou manquant"
```
⚠️  test.user - Email invalide ou manquant : "" - IGNORÉ
```

**Explication** : Normal. Les utilisateurs sans email valide sont ignorés car Keycloak exige un email.

**Solution** :
1. Mettre à jour l'email dans PostgreSQL :
   ```sql
   UPDATE personnel SET email = 'test.user@velosi.com' WHERE nom_utilisateur = 'test.user';
   ```
2. Re-exécuter le script de migration

### Erreur : "Cannot connect to PostgreSQL"
```
❌ Error: getaddrinfo ENOTFOUND aws-0-eu-north-1.pooler.supabase.com
```

**Solution** :
1. Vérifier la connexion internet
2. Vérifier les credentials Supabase dans `.env`
3. Tester la connexion manuellement avec psql ou DBeaver

---

## 🔄 Ré-exécution de la Migration

Le script est **idempotent** : vous pouvez le ré-exécuter plusieurs fois sans problème.

**Comportement** :
- ✅ Les utilisateurs déjà synchronisés (avec keycloak_id) sont **ignorés**
- ✅ Seuls les nouveaux utilisateurs sont créés dans Keycloak
- ✅ Aucune duplication n'est créée

**Exemple de sortie lors de la ré-exécution** :
```
⏭️  jean.dupont (commercial) - Déjà synchronisé (abc-123-def)
⏭️  marie.martin (administratif) - Déjà synchronisé (ghi-789-jkl)
🔄 Création de nouveau.user (finance)...
   ✅ Créé avec succès - ID Keycloak: mno-345-pqr
```

---

## 📊 Statistiques Attendues

Pour une installation typique :

| Type                      | Total | Synchronisés | Non Synchronisés | Raison           |
|---------------------------|-------|--------------|------------------|------------------|
| Personnel Actif           | 15    | 14           | 1                | Email manquant   |
| Personnel Inactif         | 3     | 0            | 3                | Ignorés (statut) |
| Client Permanent Actif    | 8     | 7            | 1                | Email manquant   |
| Client Temporaire         | 120   | 0            | 120              | Ignorés (normal) |

---

## 🎯 Prochaines Étapes Après Migration

### 1. Tester les Endpoints de Session Management

Démarrer le backend :
```powershell
npm run start:dev
```

Tester avec Postman/Thunder Client :
```http
GET http://localhost:3000/auth/personnel/1/sessions
GET http://localhost:3000/auth/personnel/1/activity
DELETE http://localhost:3000/auth/personnel/1/sessions
```

### 2. Créer le Composant Frontend

Implémenter le composant Angular pour afficher :
- Sessions actives d'un personnel
- Statistiques d'activité
- Bouton "Déconnecter toutes les sessions"

Voir template dans : `KEYCLOAK_IMPLEMENTATION_COMPLETE.md` section "Phase 4"

### 3. Déploiement Production

Voir guide : `GUIDE_DEPLOIEMENT_ETAPE_PAR_ETAPE.md`

---

## 📝 Notes Importantes

### Mots de Passe
- ⚠️ Le script **NE DÉFINIT PAS** de mots de passe dans Keycloak
- ✅ Les utilisateurs continueront à s'authentifier avec leur mot de passe PostgreSQL actuel
- 🔐 L'authentification hybride fonctionne : validation PostgreSQL + tracking Keycloak

### Clients Temporaires
- ✅ Les clients avec `is_permanent = false` sont **intentionnellement ignorés**
- ✅ Ils ne doivent PAS apparaître dans Keycloak (comportement correct)
- ✅ Seuls les clients permanents ont accès au système en ligne

### Rôles
- ✅ Personnel : commercial, administratif, chauffeur, exploitation, finance
- ✅ Client : client (unique)
- ⚠️ Les rôles doivent exister dans Keycloak AVANT la migration
- ⚠️ Exécuter `configure-keycloak.ps1` crée automatiquement ces rôles

### Performance
- ⏱️ La migration prend ~2-5 secondes par utilisateur (appels API Keycloak)
- 📊 Pour 20 utilisateurs : environ 40-100 secondes
- 💡 Affichage de la progression en temps réel dans la console

---

## 🆘 Support

En cas de problème :
1. Vérifier les logs dans la console
2. Vérifier les logs Keycloak : `c:\keycloak-old\data\log\`
3. Consulter la documentation : `KEYCLOAK_IMPLEMENTATION_COMPLETE.md`
4. Vérifier le fichier : `ANALYSE_SYNCHRONISATION_KEYCLOAK.md`

---

**Date de création** : 3 novembre 2025  
**Version** : 1.0  
**Statut** : ✅ Prêt pour exécution
