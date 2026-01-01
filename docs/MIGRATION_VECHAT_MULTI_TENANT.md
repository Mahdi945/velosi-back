# Migration VeChat vers Architecture Multi-Tenant

## ✅ Changements Effectués

### 1. Frontend - Renommage "LogiChat" → "Chat"
- ✅ `vechat.component.html` : Commentaire principal modifié
- ✅ `sidebar.component.html` : Label du menu modifié de "LogiChat" à "Chat"

### 2. Backend - Architecture Multi-Tenant

#### Entités VeChat (SANS organisation_id)
Les tables vechat utilisent l'approche multi-tenant via des bases de données séparées, exactement comme le CRM. Aucune colonne `organisation_id` n'est ajoutée aux tables.

- ✅ `vechat-message.entity.ts` : Inchangé (pas d'organisation_id)
- ✅ `vechat-conversation.entity.ts` : Inchangé (pas d'organisation_id)
- ℹ️  Les tables existent déjà dans chaque base `shipnology_*`

#### Service VeChat
- ✅ `vechat.service.ts` : 
  - Suppression de `@InjectRepository` et injection TypeORM
  - Ajout de `DatabaseConnectionService`
  - Modification de `getUserConversations()` pour accepter `databaseName` et `organisationId`
  - Modification de `createOrGetConversation()` pour utiliser des requêtes SQL directes
  - Modification de `getUserDetails()` pour utiliser des requêtes SQL avec `databaseName`

#### Controller VeChat  
- ✅ `vechat.controller.ts` :
  - Import des helpers multi-tenant (`getDatabaseName`, `getOrganisationId`)
  - Ajout de `@Req() req: any` dans les méthodes
  - Passage de `databaseName` et `organisationId` aux méthodes du service

## ⏳ À Compléter

### Méthodes du Service à Migrer

Les méthodes suivantes doivent encore être migrées pour accepter `databaseName` et `organisationId` et utiliser des requêtes SQL au lieu de TypeORM:

1. **Conversations**
   - `archiveConversation()` - Ligne ~140
   - `muteConversation()` - Ligne ~175
   - `resetUnreadCount()` - Ligne ~217

2. **Messages**
   - `getMessages()` - Récupérer les messages d'une conversation
   - `createMessage()` - Créer un nouveau message
   - `updateMessage()` - Mettre à jour un message
   - `deleteMessage()` - Supprimer un message
   - `markAsRead()` - Marquer messages comme lus
   - `markMultipleAsRead()` - Marquer plusieurs messages
   - `getUnreadMessages()` - Compter messages non lus

3. **Recherche & Filtres**
   - `searchMessages()` - Recherche dans les messages
   - `searchUsers()` - Recherche d'utilisateurs
   - `getAvailableContacts()` - Liste des contacts disponibles

4. **Présence**
   - `updatePresence()` - Mise à jour du statut de présence
   - `getUserPresence()` - Obtenir la présence d'un utilisateur

5. **Paramètres Utilisateur**
   - `getUserSettings()` - Paramètres de l'utilisateur
   - `updateUserSettings()` - Mise à jour des paramètres

6. **Upload de Fichiers**
   - `uploadFile()` - Upload de fichiers/images/vidéos
   - `deleteFile()` - Suppression de fichiers

### Controller à Migrer

Toutes les méthodes du `vechat.controller.ts` doivent:
1. Récupérer `databaseName` et `organisationId` du token
2. Les passer aux méthodes du service correspondantes

Exemples de routes à migrer:
- `PUT /conversations/:id/archive`
- `PUT /conversations/:id/mute`
- `PUT /conversations/:id/reset-unread`
- `GET /messages/:conversationId`
- `POST /messages`
- `PUT /messages/:id`
- `DELETE /messages/:id`
- `POST /messages/mark-read`
- `GET /contacts`
- `GET /search/messages`
- `GET /search/users`
- `POST /upload`
- etc.

### Gateway WebSocket (vechat.gateway.ts)

Le fichier `vechat.gateway.ts` gère les connexions WebSocket en temps réel. Il doit être adapté pour:

1. Extraire `databaseName` et `organisationId` du token JWT lors de la connexion WebSocket
2. Stocker ces informations dans le contexte de chaque socket
3. Les passer aux méthodes du service lors des événements WebSocket
4. Émettre les événements uniquement aux utilisateurs de la même organisation

Événements WebSocket à migrer:
- `message_sent` - Nouveau message envoyé
- `message_read` - Message lu
- `message_deleted` - Message supprimé
- `typing` - Utilisateur en train de taper
- `presence_update` - Mise à jour de la présence

## 📝 Pattern de Migration

### Exemple de méthode AVANT (TypeORM):
```typescript
async getMessages(conversationId: number, currentUser: any) {
  const messages = await this.messageRepository.find({
    where: { conversation_id: conversationId },
    order: { created_at: 'DESC' }
  });
  return messages;
}
```

### Exemple de méthode APRÈS (Multi-Tenant SQL):
```typescript
async getMessages(
  databaseName: string,
  organisationId: number,
  conversationId: number,
  currentUser: any
) {
  const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
  
  const messages = await connection.query(
    `SELECT * FROM vechat_messages 
     WHERE conversation_id = $1 
     ORDER BY created_at DESC`,
    [conversationId]
  );
  
  return messages;
}
```

### Exemple dans le Controller:
```typescript
@Get('messages/:conversationId')
async getMessages(
  @Param('conversationId') conversationId: string,
  @Req() req: any
) {
  const databaseName = getDatabaseName(req);
  const organisationId = getOrganisationId(req);
  
  return this.vechatService.getMessages(
    databaseName,
    organisationId,
    parseInt(conversationId),
    req.user
  );
}
```

## 🔧 Commandes Utiles

### Tester le backend:
```bash
cd velosi-back
npm run start:dev
```

### Tester le frontend:
```bash
cd velosi-front  
ng serve
```

## ✅ Validation

Pour valider que la migration fonctionne:

1. Connectez-vous avec un utilisateur de l'organisation 1
2. Envoyez des messages - ils doivent être stockés dans `shipnology_velosi`
3. Connectez-vous avec un utilisateur de l'organisation 2  
4. Les messages ne doivent PAS être visibles (isolation multi-tenant)
5. Envoyez des messages - ils doivent être stockés dans une autre base (ex: `shipnology_transport_rapide`)

## 📚 Ressources

- Architecture multi-tenant CRM : `src/crm/services/opportunities.service.ts`
- Helpers multi-tenant : `src/common/helpers/multi-tenant.helper.ts`
- Service de connexion DB : `src/common/database-connection.service.ts`
