# 🚀 VeChat Multi-Tenant - Instructions de Finalisation

## 📊 État Actuel

### ✅ Réalisé (Parties Critiques)
- **Contrôleur**: 15/15 méthodes migrées (100%)
- **Service - Infrastructure**: Système de repositories dynamiques en place
- **Service - Contacts**: 6/6 méthodes migrées (BUG PRINCIPAL RÉSOLU)
- **Service - Messages Critiques**: 3 méthodes migrées (sendMessage, getConversationMessages, updateConversationAfterMessage)

### ⏳ Restant
- **Service**: 29 méthodes à migrer (liste complète ci-dessous)
- **Erreurs TypeScript**: 73 erreurs (toutes liées aux méthodes non migrées)

## 🔧 ERREURS ACTUELLES

### Types d'erreurs:

1. **`Property 'xxxRepository' does not exist`** (45 erreurs)
   - Cause: Les méthodes utilisent encore `this.messageRepository`, `this.conversationRepository`, etc.
   - Solution: Appliquer le template de migration

2. **`Expected 4 arguments, but got 2`** (2 erreurs dans uploadFile et uploadVoiceMessage)
   - Lignes 869 et 937: `await this.sendMessage(messageData, currentUser)`
   - Solution: Ajouter `databaseName, organisationId`

3. **`Property 'xxx' does not exist on type 'Personnel'`** (11 erreurs)
   - Propriétés manquantes: `poste`, `avatar`, `chat_avatar`
   - Solution: Vérifier l'entité Personnel et ajuster le code

4. **`Property 'xxx' does not exist on type 'Client'`** (4 erreurs)
   - Propriétés manquantes: `prenom`, `societe`, `avatar`, `chat_avatar`
   - Solution: Vérifier l'entité Client et ajuster le code

## 📝 PLAN D'ACTION ÉTAPE PAR ÉTAPE

### ÉTAPE 1: Corriger les Erreurs d'Entités (15 erreurs)

#### 1.1 Vérifier l'entité Personnel
```bash
# Ouvrir le fichier
code src/entities/personnel.entity.ts

# Vérifier si ces champs existent:
- poste: string
- avatar: string
- chat_avatar: string
```

**Options:**
- **A. Si les champs existent** → Vérifier qu'ils sont bien déclarés dans l'entité
- **B. Si les champs n'existent pas** → Les ajouter OU utiliser des champs alternatifs

#### 1.2 Vérifier l'entité Client
```bash
# Ouvrir le fichier
code src/entities/client.entity.ts

# Vérifier si ces champs existent:
- prenom: string
- societe: string
- avatar: string  
- chat_avatar: string
```

#### 1.3 Si les champs manquent
Dans `vechat.service.ts`, modifier les lignes problématiques:

```typescript
// AVANT (ligne 1096):
poste: p.poste,
// APRÈS (si le champ s'appelle différemment):
poste: p.fonction || p.role, // ou supprimer si n'existe pas

// AVANT (ligne 1098):
chat_avatar: p.chat_avatar || p.avatar,
// APRÈS (si les champs n'existent pas):
chat_avatar: null, // ou utiliser un champ existant
```

### ÉTAPE 2: Migrer les Méthodes Restantes (29 méthodes)

Utiliser le **TEMPLATE DE MIGRATION** ci-dessous pour chaque méthode.

#### 2.1 CONVERSATIONS (4 méthodes - PRIORITÉ HAUTE)

1. `archiveConversation()` - Ligne ~172
2. `muteConversation()` - Ligne ~210
3. `resetUnreadCount()` - Ligne ~246
4. `deleteConversation()` - Ligne ~329

#### 2.2 MESSAGES (7 méthodes - PRIORITÉ HAUTE)

5. `updateMessage()` - Ligne ~534
6. `deleteMessage()` - Ligne ~577
7. `markMessagesAsRead()` - Ligne ~608
8. `getConversationForMessage()` - Ligne ~642
9. `updateUnreadCountersForConversation()` - Ligne ~664
10. `clearConversationMessages()` - Ligne ~720
11. `searchMessages()` - Ligne ~760

#### 2.3 UPLOAD (2 méthodes - PRIORITÉ MOYENNE)

12. `uploadFile()` - Ligne ~825
13. `uploadVoiceMessage()` - Ligne ~893

#### 2.4 PRÉSENCE (2 méthodes - PRIORITÉ BASSE)

14. `updatePresence()` - Ligne ~1237
15. `getPresenceStatus()` - Ligne ~1267

#### 2.5 PARAMÈTRES (2 méthodes - PRIORITÉ BASSE)

16. `getUserSettings()` - Ligne ~1284
17. `updateUserSettings()` - Ligne ~1309

#### 2.6 STATISTIQUES (1 méthode - PRIORITÉ BASSE)

18. `getChatStatistics()` - Ligne ~1331

#### 2.7 MÉTHODES UTILITAIRES (12 méthodes - PRIORITÉ MOYENNE)

19. `getMessagesByIds()` - Pour WebSocket
20. `getUnreadCountsForUser()` - Pour WebSocket
21. `getConversationById()` - Pour WebSocket
22. `getConversationsForUser()` - Pour WebSocket
23. `getUnreadMessagesForUserInConversation()` - Pour WebSocket
24-29. Autres méthodes helper

## 🎯 TEMPLATE DE MIGRATION

```typescript
// ==================================
// AVANT - Méthode originale
// ==================================
async maMethode(
  conversationId: number,
  userId: number,
  userType: 'personnel' | 'client',
  currentUser: any
) {
  // ...vérifications...
  
  const conversation = await this.conversationRepository.findOne({
    where: { id: conversationId }
  });
  
  // ...logique...
  
  return await this.conversationRepository.save(conversation);
}

// ==================================
// APRÈS - Méthode migrée
// ==================================
async maMethode(
  conversationId: number,
  userId: number,
  userType: 'personnel' | 'client',
  currentUser: any,
  databaseName: string,  // ← AJOUTÉ
  organisationId: number // ← AJOUTÉ
) {
  console.log(`🏢 [maMethode] DB: ${databaseName}, Org: ${organisationId}`); // ← AJOUTÉ
  
  // ...vérifications...
  
  // ← AJOUTÉ: Obtenir repositories dynamiques
  const { conversationRepository } = await this.getRepositories(databaseName);
  
  const conversation = await conversationRepository.findOne({ // ← MODIFIÉ: Sans 'this.'
    where: { id: conversationId }
  });
  
  // ...logique...
  
  return await conversationRepository.save(conversation); // ← MODIFIÉ: Sans 'this.'
}
```

## 🔍 RECHERCHER ET REMPLACER

Pour accélérer la migration, utiliser VS Code Search & Replace:

### 1. Remplacer les repositories
```
Rechercher: this\.conversationRepository
Remplacer par: conversationRepository
```
**ATTENTION**: Ne pas faire "Replace All" ! Vérifier chaque occurrence car:
- Certaines méthodes n'ont pas encore `const { conversationRepository } = ...`
- Il faut ajouter databaseName en paramètre d'abord

### 2. Ajouter les paramètres
Pour chaque méthode `async xxxxx(...)`:
1. Ajouter à la fin: `, databaseName: string, organisationId: number`
2. Ajouter au début: `console.log(\`🏢 [xxxxx] DB: \${databaseName}, Org: \${organisationId}\`);`
3. Ajouter après logs: `const { ...repositories } = await this.getRepositories(databaseName);`

## ✅ VALIDATION

Après chaque méthode migrée, vérifier:

```bash
# Compiler
npm run build

# Le nombre d'erreurs doit diminuer
```

### Progression attendue:
- Départ: 73 erreurs
- Après Étape 1 (entités): ~58 erreurs
- Après 5 méthodes: ~40 erreurs
- Après 10 méthodes: ~25 erreurs
- Après 15 méthodes: ~10 erreurs
- Après 29 méthodes: 0 erreur ✅

## 🧪 TESTS FONCTIONNELS

### Test Minimal (Après migration conversations + messages critiques)
```bash
# 1. Compiler sans erreur
npm run build

# 2. Lancer le serveur
npm run start:dev

# 3. Test API
curl -X GET http://localhost:3000/api/vechat/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: Liste des contacts avec vrais noms
```

### Test Complet (Après migration totale)
1. Connexion utilisateur Velosi → Voir contacts Velosi
2. Créer conversation → Envoyer message
3. Connexion utilisateur Danino → Voir contacts Danino
4. Vérifier isolation (aucune conversation de Velosi)

## 📚 RESSOURCES

- **Modèle de référence**: `getUserDetails()`, `getPersonnelContacts()` (déjà migrés)
- **Documentation**: `VECHAT_MIGRATION_COMPLETE.md`
- **Services similaires**: `src/crm/services/quotes.service.ts` (utilise déjà DatabaseConnectionService)

## 🎓 EXEMPLE COMPLET

Voir la méthode `sendMessage()` dans `vechat.service.ts` pour un exemple complet de migration avec:
- ✅ Paramètres databaseName/organisationId
- ✅ getRepositories() pour obtenir les repositories
- ✅ Appels à getUserDetails() avec databaseName
- ✅ Appels à updateConversationAfterMessage() avec databaseName
- ✅ Logs de debug

## 💡 CONSEILS

1. **Migrer par lot**: Faire 3-5 méthodes, compiler, corriger, tester
2. **Priorité**: Conversations et Messages d'abord (impact utilisateur direct)
3. **Tester fréquemment**: Un test après chaque lot évite de chercher des bugs longtemps
4. **Commits fréquents**: Git commit après chaque lot fonctionnel

## ⚠️ PIÈGES À ÉVITER

1. **Ne pas oublier de passer databaseName** aux méthodes privées appelées
2. **getUserDetails() a changé de signature** - passer databaseName en 3ème paramètre
3. **updateConversationAfterMessage() a changé** - passer databaseName en 2ème paramètre
4. **Les méthodes upload** doivent aussi appeler sendMessage() avec les bons paramètres

## 🎉 SUCCÈS

Quand vous aurez:
- ✅ 0 erreur TypeScript
- ✅ Compilation réussie
- ✅ Tests fonctionnels OK

Vous aurez réussi la migration complète du VeChat vers l'architecture multi-tenant! 🚀
