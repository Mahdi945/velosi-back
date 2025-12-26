# 🚀 Guide de Déploiement - VeChat Multi-Tenant

## 📋 Résumé des modifications

Le système VeChat a été mis à jour pour supporter l'architecture multi-tenant. Les tables `vechat_conversations`, `vechat_messages`, `vechat_presence` et `vechat_user_settings` incluent maintenant un champ `organisation_id`.

## ✅ Modifications effectuées dans le code

### 1. Entités TypeORM (entities/)
- ✅ `VechatConversation`: Ajout `organisation_id` NOT NULL avec index
- ✅ `VechatMessage`: Ajout `organisation_id` NOT NULL avec index
- ✅ `VechatPresence`: Ajout `organisation_id` NOT NULL avec index  
- ✅ `VechatUserSettings`: Ajout `organisation_id` NOT NULL avec index

### 2. VechatModule
- ✅ Import de `DatabaseModule` pour accéder aux services multi-tenant
- ✅ `TenantRepositoryService` et `DatabaseConnectionService` disponibles via injection

### 3. VechatService
#### Nouveautés:
- ✅ Injection du `REQUEST` pour accéder au contexte de la requête
- ✅ Méthode `getOrganisationContext()` pour extraire `organisationId` et `databaseName`

#### Méthodes corrigées (filtre organisation_id ajouté):
- ✅ `getUserConversations()` 
- ✅ `createOrGetConversation()`
- ✅ `sendMessage()`
- ✅ `getConversationMessages()`

#### Méthodes à finaliser (voir VECHAT_MULTI_TENANT_CORRECTIONS.md):
- ⏳ `archiveConversation()`
- ⏳ `muteConversation()`
- ⏳ `resetUnreadCount()`
- ⏳ `deleteConversation()`
- ⏳ `updateMessage()`
- ⏳ `deleteMessage()`
- ⏳ `markMessagesAsRead()`
- ⏳ Et autres (voir document de référence)

## 🔧 Étapes de déploiement

### Étape 1: Arrêter l'application
```powershell
# Arrêter le backend
cd c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
# Ctrl+C pour arrêter le serveur
```

### Étape 2: Exécuter la migration SQL

**IMPORTANT**: Cette migration doit être exécutée sur **TOUTES** les bases de données d'organisations.

```powershell
# Pour la base principale 'velosi'
psql -U postgres -d velosi -f add-organisation-id-to-vechat.sql

# Pour d'autres organisations (exemple)
# psql -U postgres -d organisation_2 -f add-organisation-id-to-vechat.sql
# psql -U postgres -d organisation_3 -f add-organisation-id-to-vechat.sql
```

Ou via pgAdmin:
1. Ouvrir pgAdmin
2. Sélectionner la base de données
3. Ouvrir Query Tool
4. Charger le fichier `add-organisation-id-to-vechat.sql`
5. Exécuter
6. Vérifier les résultats (devrait afficher les 4 tables avec organisation_id)

### Étape 3: Vérifier la migration

```sql
-- Vérifier que les colonnes ont été ajoutées
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('vechat_conversations', 'vechat_messages', 'vechat_presence', 'vechat_user_settings')
  AND column_name = 'organisation_id';

-- Devrait retourner 4 lignes (une par table)

-- Vérifier que les données existantes ont organisation_id = 1
SELECT 'vechat_conversations' as table_name, COUNT(*) as total, COUNT(organisation_id) as with_org_id
FROM vechat_conversations
UNION ALL
SELECT 'vechat_messages', COUNT(*), COUNT(organisation_id)
FROM vechat_messages
UNION ALL
SELECT 'vechat_presence', COUNT(*), COUNT(organisation_id)
FROM vechat_presence
UNION ALL
SELECT 'vechat_user_settings', COUNT(*), COUNT(organisation_id)
FROM vechat_user_settings;
```

### Étape 4: Rebuild et redémarrer l'application

```powershell
cd c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back

# Installer les dépendances (si besoin)
npm install

# Redémarrer en mode développement
npm run start:dev
```

### Étape 5: Tester

1. **Se connecter en tant qu'utilisateur de l'organisation 1 (Velosi)**
   - Ouvrir VeChat
   - Vérifier que les conversations existantes sont visibles
   - Créer une nouvelle conversation
   - Envoyer un message

2. **Se connecter en tant qu'utilisateur d'une autre organisation**
   - Ouvrir VeChat
   - Vérifier qu'aucune conversation de l'organisation 1 n'apparaît
   - Créer une conversation
   - Vérifier l'isolation complète

3. **Vérifier dans la base de données**
```sql
-- Les nouvelles conversations doivent avoir le bon organisation_id
SELECT id, participant1_id, participant2_id, organisation_id, created_at
FROM vechat_conversations
ORDER BY created_at DESC
LIMIT 5;

-- Les nouveaux messages doivent avoir le bon organisation_id
SELECT id, sender_id, receiver_id, organisation_id, created_at
FROM vechat_messages
ORDER BY created_at DESC
LIMIT 10;
```

## ⚠️ Points d'attention

### Données existantes
- Toutes les données VeChat existantes seront attribuées à `organisation_id = 1` (Velosi)
- Si vous avez des données VeChat d'autres organisations, vous devrez les migrer manuellement

### Performance
- Les index sur `organisation_id` ont été créés pour maintenir les performances
- Les requêtes filtrent maintenant systématiquement sur `organisation_id`

### WebSocket Gateway
- Le gateway VeChat doit également être mis à jour pour extraire `organisationId` du JWT
- Ceci sera fait dans une mise à jour ultérieure si nécessaire

## 🔄 Rollback (en cas de problème)

Si vous devez annuler la migration:

```sql
-- ATTENTION: Ceci supprimera la colonne organisation_id et tous ses index
ALTER TABLE vechat_conversations DROP COLUMN IF EXISTS organisation_id CASCADE;
ALTER TABLE vechat_messages DROP COLUMN IF EXISTS organisation_id CASCADE;
ALTER TABLE vechat_presence DROP COLUMN IF EXISTS organisation_id CASCADE;
ALTER TABLE vechat_user_settings DROP COLUMN IF EXISTS organisation_id CASCADE;

-- Recréer les anciens index uniques
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vechat_conversations_participants"
ON vechat_conversations (participant1_id, participant1_type, participant2_id, participant2_type);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vechat_presence_user"
ON vechat_presence (user_id, user_type);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vechat_user_settings_user"
ON vechat_user_settings (user_id, user_type);
```

Puis restaurer le code à partir de Git:
```powershell
cd c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
git restore src/vechat/
```

## 📞 Support

En cas de problème:
1. Vérifier les logs du backend
2. Vérifier que la migration SQL s'est bien exécutée
3. Vérifier que `organisation_id` est présent dans le JWT du user connecté
4. Consulter le fichier `VECHAT_MULTI_TENANT_CORRECTIONS.md` pour les méthodes restantes

## 📚 Références

- `add-organisation-id-to-vechat.sql` - Script de migration
- `VECHAT_MULTI_TENANT_CORRECTIONS.md` - Liste complète des modifications
- `fix-vechat-multi-tenant.ps1` - Script automatisé (non testé, à utiliser avec précaution)

---

**Date de création**: 22 décembre 2025  
**Version**: 1.0  
**Status**: ✅ Prêt pour déploiement (après finalisation des méthodes restantes)
