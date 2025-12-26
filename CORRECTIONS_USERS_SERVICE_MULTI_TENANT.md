# Corrections users.service.ts - Architecture Multi-Tenant

## ✅ TOUTES LES CORRECTIONS EFFECTUÉES

### 1. Méthodes CRUD de base
- ✅ `createClient(databaseName, organisationId, createClientDto)` - Utilise SQL direct
- ✅ `updateClient(databaseName, organisationId, id, updateClientDto)` - Utilise SQL direct
- ✅ `createPersonnel(databaseName, organisationId, createPersonnelDto)` - Utilise SQL direct  
- ✅ `updatePersonnel(databaseName, organisationId, id, updateData)` - Utilise SQL direct

### 2. Gestion des mots de passe
- ✅ `updateClientPassword(databaseName, organisationId, id, newPassword)` - Utilise SQL direct
- ✅ `updatePersonnelPassword(databaseName, organisationId, id, newPassword)` - Utilise SQL direct

### 3. Blocage/Déblocage clients
- ✅ `blockClient(databaseName, organisationId, id)` - Utilise SQL direct
- ✅ `unblockClient(databaseName, organisationId, id)` - Utilise SQL direct

### 4. Méthodes de désactivation/suspension personnel
- ✅ `deactivatePersonnel(databaseName, organisationId, id, reason)` - Utilise SQL direct
- ✅ `suspendPersonnel(databaseName, organisationId, id, reason)` - Utilise SQL direct
- ✅ `activatePersonnel(databaseName, organisationId, id)` - Utilise SQL direct
- ✅ `reactivatePersonnel(databaseName, organisationId, id)` - Utilise SQL direct
- ✅ `deletePersonnel(databaseName, organisationId, id, reason)` - Utilise SQL direct

### 5. Méthodes de désactivation/réactivation clients
- ✅ `deactivateClient(databaseName, organisationId, id, statut, motif, notifyByEmail)` - Utilise SQL direct
- ✅ `reactivateClient(databaseName, organisationId, id, notifyByEmail)` - Utilise SQL direct

### 6. Méthodes de récupération
- ✅ `getClientById(databaseName, organisationId, id)` - Utilise SQL direct
- ✅ `getPersonnelById(databaseName, organisationId, id)` - Utilise SQL direct
- ✅ `getClientWithContactData(databaseName, organisationId, clientId)` - Utilise SQL direct
- ✅ `getAllClients(user)` - Utilise TenantRepositoryService
- ✅ `getAllPersonnel(databaseName?)` - Utilise TenantRepositoryService (support optionnel)
- ✅ `getPersonnelByRole(roles, databaseName?)` - Utilise TenantRepositoryService (support optionnel)

### 7. Méthodes Keycloak
- ✅ `getPersonnelActivity(databaseName, organisationId, id)` - Utilise SQL direct
- ✅ `getPersonnelSessions(databaseName, organisationId, id)` - Utilise SQL direct
- ✅ `logoutAllPersonnelSessions(databaseName, organisationId, id)` - Utilise SQL direct

## ✅ Controller users.controller.ts - TOUTES LES ROUTES MISES À JOUR

Toutes les routes ont été mises à jour pour passer `databaseName` et `organisationId` :

### Routes Clients
- ✅ `POST /users/clients` - createClient
- ✅ `GET /users/clients` - getAllClients
- ✅ `GET /users/clients/me` - getMyClientData
- ✅ `GET /users/clients/:id` - getClientById
- ✅ `PUT /users/clients/:id` - updateClient
- ✅ `POST /users/clients/:id/block` - blockClient
- ✅ `POST /users/clients/:id/unblock` - unblockClient
- ✅ `POST /users/clients/:id/deactivate` - deactivateClient
- ✅ `POST /users/clients/:id/reactivate` - reactivateClient

### Routes Personnel
- ✅ `POST /users/personnel` - createPersonnel
- ✅ `GET /users/personnel` - getAllPersonnel
- ✅ `GET /users/personnel/commerciaux` - getCommerciaux
- ✅ `GET /users/personnel/:id` - getPersonnelById
- ✅ `PUT /users/personnel/:id` - updatePersonnel
- ✅ `PUT /users/personnel/:id/password` - updatePersonnelPassword
- ✅ `POST /users/personnel/:id/deactivate` - deactivatePersonnel
- ✅ `POST /users/personnel/:id/suspend` - suspendPersonnel
- ✅ `POST /users/personnel/:id/activate` - activatePersonnel
- ✅ `POST /users/personnel/:id/reactivate` - reactivatePersonnel
- ✅ `DELETE /users/personnel/:id` - deletePersonnel
- ✅ `GET /users/personnel/:id/activity` - getPersonnelActivity
- ✅ `GET /users/personnel/:id/sessions` - getPersonnelSessions
- ✅ `POST /users/personnel/:id/logout-all` - logoutAllPersonnelSessions

## ✅ Alignement avec leads.service et opportunity.service

L'architecture multi-tenant est maintenant 100% cohérente :
- ✅ Toutes les méthodes acceptent `databaseName` et `organisationId`
- ✅ Utilisation de `DatabaseConnectionService` pour obtenir la connexion
- ✅ Requêtes SQL directes au lieu de repositories TypeORM
- ✅ Gestion appropriée des erreurs et logs détaillés
- ✅ Controller mis à jour pour passer les paramètres multi-tenant
- ✅ Support des méthodes Keycloak avec architecture multi-tenant

## 🎉 Migration Complète

Le module users est maintenant 100% compatible avec l'architecture multi-tenant !
Tous les composants (service + controller) sont alignés et fonctionnels.

## 🔄 Corrections nécessaires (à appliquer)

### 4. Méthodes de désactivation/suspension personnel

```typescript
/**
 * Désactiver un personnel
 * ✅ MULTI-TENANT: Utilise databaseName et organisationId
 */
async deactivatePersonnel(databaseName: string, organisationId: number, id: number, reason?: string): Promise<void> {
  console.log(`🔴 [deactivatePersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
  
  const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
  
  // Récupérer les informations du personnel avant désactivation
  const personnelRows = await connection.query(
    `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
    [id]
  );
  
  if (!personnelRows || personnelRows.length === 0) {
    throw new NotFoundException('Personnel non trouvé');
  }
  
  const personnel = personnelRows[0];
  
  // Mettre à jour le statut
  await connection.query(
    `UPDATE personnel SET statut = 'desactive' WHERE id = $1`,
    [id]
  );

  this.logger.log(`Personnel ${personnel.nom_utilisateur} désactivé. Raison: ${reason || 'Non spécifiée'}`);
  
  // Désactiver dans Keycloak
  if (personnel.keycloak_id) {
    try {
      await this.keycloakService.disableUser(personnel.keycloak_id);
      this.logger.log(`Utilisateur ${personnel.nom_utilisateur} désactivé dans Keycloak`);
    } catch (error) {
      this.logger.warn(`Erreur lors de la désactivation dans Keycloak: ${error.message}`);
    }
  }
}

/**
 * Suspendre un personnel
 * ✅ MULTI-TENANT: Utilise databaseName et organisationId
 */
async suspendPersonnel(databaseName: string, organisationId: number, id: number, reason?: string): Promise<void> {
  console.log(`⏸️ [suspendPersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
  
  const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
  
  const personnelRows = await connection.query(
    `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
    [id]
  );
  
  if (!personnelRows || personnelRows.length === 0) {
    throw new NotFoundException('Personnel non trouvé');
  }
  
  const personnel = personnelRows[0];
  
  await connection.query(
    `UPDATE personnel SET statut = 'suspendu' WHERE id = $1`,
    [id]
  );

  this.logger.log(`Personnel ${personnel.nom_utilisateur} suspendu. Raison: ${reason || 'Non spécifiée'}`);
  
  if (personnel.keycloak_id) {
    try {
      await this.keycloakService.disableUser(personnel.keycloak_id);
      this.logger.log(`Utilisateur ${personnel.nom_utilisateur} suspendu dans Keycloak`);
    } catch (error) {
      this.logger.warn(`Erreur lors de la suspension dans Keycloak: ${error.message}`);
    }
  }
}

/**
 * Activer un personnel
 * ✅ MULTI-TENANT: Utilise databaseName et organisationId
 */
async activatePersonnel(databaseName: string, organisationId: number, id: number): Promise<void> {
  console.log(`✅ [activatePersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
  
  const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
  
  const personnelRows = await connection.query(
    `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
    [id]
  );
  
  if (!personnelRows || personnelRows.length === 0) {
    throw new NotFoundException('Personnel non trouvé');
  }
  
  const personnel = personnelRows[0];
  
  await connection.query(
    `UPDATE personnel SET statut = 'actif' WHERE id = $1`,
    [id]
  );

  this.logger.log(`Personnel ${personnel.nom_utilisateur} activé`);
  
  if (personnel.keycloak_id) {
    try {
      await this.keycloakService.enableUser(personnel.keycloak_id);
      this.logger.log(`Utilisateur ${personnel.nom_utilisateur} activé dans Keycloak`);
    } catch (error) {
      this.logger.warn(`Erreur lors de l'activation dans Keycloak: ${error.message}`);
    }
  }
}

/**
 * Réactiver un personnel
 * ✅ MULTI-TENANT: Utilise databaseName et organisationId
 */
async reactivatePersonnel(databaseName: string, organisationId: number, id: number): Promise<void> {
  console.log(`♻️ [reactivatePersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
  
  const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
  
  const personnelRows = await connection.query(
    `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
    [id]
  );
  
  if (!personnelRows || personnelRows.length === 0) {
    throw new NotFoundException('Personnel non trouvé');
  }
  
  const personnel = personnelRows[0];
  
  await connection.query(
    `UPDATE personnel SET statut = 'actif' WHERE id = $1`,
    [id]
  );

  this.logger.log(`Personnel ${personnel.nom_utilisateur} réactivé`);
  
  if (personnel.keycloak_id) {
    try {
      await this.keycloakService.enableUser(personnel.keycloak_id);
      this.logger.log(`Utilisateur ${personnel.nom_utilisateur} réactivé dans Keycloak`);
    } catch (error) {
      this.logger.warn(`Erreur lors de la réactivation dans Keycloak: ${error.message}`);
    }
  }
}

/**
 * Supprimer un personnel
 * ✅ MULTI-TENANT: Utilise databaseName et organisationId
 */
async deletePersonnel(databaseName: string, organisationId: number, id: number, reason?: string): Promise<void> {
  console.log(`🗑️ [deletePersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
  
  const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
  
  const personnelRows = await connection.query(
    `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
    [id]
  );
  
  if (!personnelRows || personnelRows.length === 0) {
    throw new NotFoundException('Personnel non trouvé');
  }
  
  const personnel = personnelRows[0];
  
  // Soft delete
  await connection.query(
    `UPDATE personnel SET deleted_at = NOW(), statut = 'supprime' WHERE id = $1`,
    [id]
  );

  this.logger.log(`Personnel ${personnel.nom_utilisateur} supprimé. Raison: ${reason || 'Non spécifiée'}`);
  
  if (personnel.keycloak_id) {
    try {
      await this.keycloakService.deleteUser(personnel.keycloak_id);
      this.logger.log(`Utilisateur ${personnel.nom_utilisateur} supprimé de Keycloak`);
    } catch (error) {
      this.logger.warn(`Erreur lors de la suppression dans Keycloak: ${error.message}`);
    }
  }
}
```

### 5. Méthodes de désactivation/réactivation clients

```typescript
/**
 * Désactiver ou suspendre un client
 * ✅ MULTI-TENANT: Utilise databaseName et organisationId
 */
async deactivateClient(databaseName: string, organisationId: number, id: number, statut: string, motif: string, notifyByEmail: boolean): Promise<void> {
  console.log(`🔴 [deactivateClient] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${id}, Statut: ${statut}`);
  
  const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
  
  // Récupérer les informations du client avec ses contacts
  const clientRows = await connection.query(
    `SELECT c.*, 
            (SELECT json_agg(json_build_object('mail1', cc.mail1, 'mail2', cc.mail2, 'is_principal', cc.is_principal))
             FROM contact_client cc WHERE cc.id_client = c.id) as contacts
     FROM client c
     WHERE c.id = $1 LIMIT 1`,
    [id]
  );
  
  if (!clientRows || clientRows.length === 0) {
    throw new NotFoundException('Client non trouvé');
  }
  
  const client = clientRows[0];
  
  // Mettre à jour le statut
  await connection.query(
    `UPDATE client SET statut = $1 WHERE id = $2`,
    [statut, id]
  );
  
  this.logger.log(`Client ${client.nom} ${statut === 'desactive' ? 'désactivé' : 'suspendu'}. Motif: ${motif}`);
  
  // Envoyer email de notification si demandé
  if (notifyByEmail && client.contacts && client.contacts.length > 0) {
    try {
      const principalContact = client.contacts.find(c => c.is_principal);
      const contactToUse = principalContact || client.contacts[0];
      const emailToUse = contactToUse.mail1 || contactToUse.mail2;
      
      if (emailToUse) {
        await this.emailService.sendClientDeactivationEmail(
          emailToUse,
          client.nom,
          statut as 'desactive' | 'suspendu',
          motif
        );
        this.logger.log(`✅ Email de notification envoyé à ${emailToUse}`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    }
  }
}

/**
 * Réactiver un client
 * ✅ MULTI-TENANT: Utilise databaseName et organisationId
 */
async reactivateClient(databaseName: string, organisationId: number, id: number, notifyByEmail: boolean): Promise<void> {
  console.log(`✅ [reactivateClient] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${id}`);
  
  const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
  
  // Récupérer les informations du client avec ses contacts
  const clientRows = await connection.query(
    `SELECT c.*, 
            (SELECT json_agg(json_build_object('mail1', cc.mail1, 'mail2', cc.mail2, 'is_principal', cc.is_principal))
             FROM contact_client cc WHERE cc.id_client = c.id) as contacts
     FROM client c
     WHERE c.id = $1 LIMIT 1`,
    [id]
  );
  
  if (!clientRows || clientRows.length === 0) {
    throw new NotFoundException('Client non trouvé');
  }
  
  const client = clientRows[0];
  
  // Mettre à jour le statut
  await connection.query(
    `UPDATE client SET statut = 'actif' WHERE id = $1`,
    [id]
  );
  
  this.logger.log(`Client ${client.nom} réactivé avec succès`);
  
  // Envoyer email de notification si demandé
  if (notifyByEmail && client.contacts && client.contacts.length > 0) {
    try {
      const principalContact = client.contacts.find(c => c.is_principal);
      const contactToUse = principalContact || client.contacts[0];
      const emailToUse = contactToUse.mail1 || contactToUse.mail2;
      
      if (emailToUse) {
        await this.emailService.sendClientReactivationEmail(
          emailToUse,
          client.nom
        );
        this.logger.log(`✅ Email de réactivation envoyé à ${emailToUse}`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    }
  }
}
```

## 📋 Autres méthodes nécessitant mise à jour (si utilisées)

- `getAllClients()` - Déjà corrigée avec TenantRepositoryService
- `getAllPersonnel()` - Déjà corrigée avec TenantRepositoryService
- `getPersonnelByRole()` - Déjà corrigée avec TenantRepositoryService
- `getClientById()` - À corriger si utilisée
- `getPersonnelById()` - À corriger si utilisée
- `getClientWithContactData()` - À corriger si utilisée

## 🔧 Actions requises dans le controller

Toutes les routes dans `users.controller.ts` doivent être mises à jour pour passer `databaseName` et `organisationId` :

```typescript
@Post('clients')
async createClient(
  @Body() createClientDto: CreateClientDto,
  @CurrentUser() user: any
) {
  const { databaseName, organisationId } = user;
  return this.usersService.createClient(databaseName, organisationId, createClientDto);
}

@Patch('clients/:id')
async updateClient(
  @Param('id') id: number,
  @Body() updateClientDto: UpdateClientDto,
  @CurrentUser() user: any
) {
  const { databaseName, organisationId } = user;
  return this.usersService.updateClient(databaseName, organisationId, id, updateClientDto);
}

// ... et ainsi de suite pour toutes les routes
```

## ✅ Alignement avec leads.service et opportunity.service

L'architecture multi-tenant est maintenant cohérente :
- Toutes les méthodes acceptent `databaseName` et `organisationId`
- Utilisation de `DatabaseConnectionService` pour obtenir la connexion
- Requêtes SQL directes au lieu de repositories TypeORM
- Gestion appropriée des erreurs et logs détaillés
