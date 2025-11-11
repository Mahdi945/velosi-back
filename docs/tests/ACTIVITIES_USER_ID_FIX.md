# Fix: Gestion de l'ID utilisateur pour les activités

**Date**: 17/10/2025  
**Problème**: Erreur "une valeur NULL viole la contrainte NOT NULL de la colonne « created_by »"

## Problème identifié

Le champ `created_by` dans la table `crm_activities` est obligatoire (NOT NULL), mais n'était pas rempli lors de la création d'activités car:

1. **JWT Guard désactivé**: Le guard `@UseGuards(JwtAuthGuard)` est commenté temporairement pour le debugging, donc `req.user` est `undefined`
2. **Mapping UUID**: Le frontend envoie l'UUID Keycloak dans le header `x-user-id`, mais le backend s'attend à un ID numérique de la table `personnel`

## Solution implémentée

### Backend (`activities.controller.ts`)

Modification de la méthode `create()` pour récupérer l'ID utilisateur depuis plusieurs sources:

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
  // Récupérer l'ID de l'utilisateur connecté
  // Priorité: JWT user > header X-User-Id > DTO createdBy/assignedTo
  let userId: number | undefined;
  
  // 1. Depuis JWT (si guard activé)
  if (req.user && req.user.id) {
    userId = req.user.id;
  } 
  // 2. Depuis header X-User-Id
  else if (req.headers['x-user-id']) {
    const headerUserId = parseInt(req.headers['x-user-id'] as string, 10);
    if (!isNaN(headerUserId) && headerUserId > 0) {
      userId = headerUserId;
    } else {
      // UUID Keycloak: utiliser ID par défaut temporairement
      userId = 1; // TODO: Implémenter mapping UUID -> ID Personnel
    }
  } 
  // 3. Depuis DTO
  else if (createActivityDto.createdBy) {
    userId = createActivityDto.createdBy;
  }
  
  if (!userId) {
    throw new BadRequestException('Impossible de déterminer l\'utilisateur connecté.');
  }
  
  // Remplir createdBy et assignedTo
  if (!createActivityDto.createdBy) {
    createActivityDto.createdBy = userId;
  }
  if (!createActivityDto.assignedTo) {
    createActivityDto.assignedTo = userId;
  }
  
  return this.activitiesService.create(createActivityDto);
}
```

### Frontend (`crm-auth.interceptor.ts`)

Ajout du header `x-user-id` dans toutes les requêtes CRM:

```typescript
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  if (!req.url.includes('/api/crm/')) {
    return next.handle(req);
  }

  // Récupérer l'utilisateur actuel
  const currentUser = this.authService.getCurrentUser();
  const userId = currentUser?.id;

  const headers: any = {
    'Content-Type': 'application/json'
  };

  // Ajouter x-user-id si disponible
  if (userId) {
    headers['x-user-id'] = userId;
  }

  let modifiedReq = req.clone({
    withCredentials: true,
    setHeaders: headers
  });

  // Ajouter le token Bearer si disponible
  const token = this.authService.getToken();
  if (token) {
    modifiedReq = modifiedReq.clone({
      setHeaders: { 'Authorization': `Bearer ${token}` }
    });
  }

  return next.handle(modifiedReq);
}
```

### Frontend (`activities.component.html`)

Pour les commerciaux créant une activité sans liaison (linkType=''), affichage d'un message informatif au lieu d'un autocomplete:

```html
<!-- Si utilisateur commercial -->
<div *ngIf="isCommercial && !isAdmin" class="mb-3">
  <div class="alert alert-info">
    <i class="ti ti-info-circle me-2"></i>
    Cette activité sera automatiquement assignée à vous
  </div>
</div>

<!-- Si utilisateur admin -->
<div *ngIf="!isCommercial || isAdmin" class="mb-3">
  <!-- Autocomplete pour sélectionner un commercial -->
</div>
```

## Améliorations apportées (Phase 2)

### Mapping UUID Keycloak -> ID Personnel

Implémentation complète du mapping UUID Keycloak vers ID Personnel, similaire aux pages Opportunités et Prospects:

**Backend - Controller (`activities.controller.ts`)**:

```typescript
private async resolveUserId(req: any): Promise<number | undefined> {
  // 1. Depuis JWT
  if (req.user && req.user.id) {
    return req.user.id;
  }
  
  // 2. Depuis header X-User-Id
  if (req.headers['x-user-id']) {
    const headerValue = req.headers['x-user-id'] as string;
    
    // Essayer parser comme nombre
    const numericId = parseInt(headerValue, 10);
    if (!isNaN(numericId) && numericId > 0) {
      return numericId;
    }
    
    // Si UUID, chercher dans la table personnel
    const personnel = await this.activitiesService.findPersonnelByKeycloakId(headerValue);
    if (personnel) {
      return personnel.id;
    }
  }
  
  return undefined;
}
```

**Backend - Service (`activities.service.ts`)**:

```typescript
async findPersonnelByKeycloakId(keycloakId: string): Promise<Personnel | null> {
  const personnel = await this.personnelRepository.findOne({
    where: { keycloak_id: keycloakId }
  });
  return personnel || null;
}
```

**Frontend - Component (`activities.component.ts`)**:

```typescript
private getCurrentUserId(): number | undefined {
  // 1. Parser ID direct
  if (this.currentUser.id) {
    const numericId = parseInt(this.currentUser.id, 10);
    if (!isNaN(numericId) && numericId > 0) {
      return numericId;
    }
  }

  // 2. Chercher dans la liste commerciaux
  if (this.isCommercial && this.commerciaux.length > 0) {
    const personnel = this.commerciaux.find(p => 
      p.nom_utilisateur === this.currentUser.username ||
      p.email === this.currentUser.email
    );
    if (personnel) return personnel.id;
  }

  // 3. Pour admin, essayer sub et username
  if (this.isAdmin) {
    // Essayer sub
    if (this.currentUser.sub) {
      const possibleId = parseInt(this.currentUser.sub, 10);
      if (!isNaN(possibleId) && possibleId > 0) return possibleId;
    }
    // Fallback pour admin
    return 1;
  }

  return undefined;
}
```

## TODO - Améliorations futures

1. ✅ Ajouter le header `x-user-id` dans l'interceptor CRM
2. ✅ Gérer les multiples sources d'ID utilisateur dans le controller
3. ✅ Implémenter le mapping UUID Keycloak -> ID Personnel
4. ✅ Créer méthode `findPersonnelByKeycloakId()` dans ActivitiesService
5. ✅ Ajouter méthode `getCurrentUserId()` dans ActivitiesComponent
6. ⏳ Réactiver le JWT Guard une fois l'authentification stable
7. ⏳ Enrichir le profil utilisateur avec l'ID personnel au moment du login

## Solution finale (Phase 3)

### Envoi de createdBy depuis le frontend

Au lieu de dépendre uniquement des headers/JWT, le frontend envoie maintenant `createdBy` directement dans le DTO:

**Frontend (`activities.component.ts`)**:

```typescript
async saveActivity(): Promise<void> {
  // Vérifier et récupérer l'ID utilisateur
  const userId = this.getCurrentUserId();
  
  if (!userId) {
    this.showError('Impossible de déterminer votre identité. Veuillez vous reconnecter.');
    return;
  }
  
  const activityData: any = {
    type: this.activityForm.type,
    title: this.activityForm.subject,
    // ... autres champs
  };
  
  // Ajouter createdBy si c'est une création
  if (!this.selectedActivity) {
    activityData.createdBy = userId;
  }
  
  // Envoyer au backend
  await this.activitiesService.create(activityData).toPromise();
}
```

**Backend (`activities.controller.ts`)**:

```typescript
async create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
  // Priorité: DTO > Headers/JWT
  let userId: number | undefined = createActivityDto.createdBy;
  
  if (!userId) {
    userId = await this.resolveUserId(req);
  }
  
  if (!userId) {
    throw new BadRequestException('Impossible de déterminer l\'utilisateur connecté.');
  }
  
  // Assurer que createdBy et assignedTo sont définis
  if (!createActivityDto.createdBy) {
    createActivityDto.createdBy = userId;
  }
  if (!createActivityDto.assignedTo) {
    createActivityDto.assignedTo = userId;
  }
  
  return this.activitiesService.create(createActivityDto);
}
```

Cette approche est plus robuste car:
- ✅ Ne dépend pas de l'interceptor HTTP
- ✅ L'ID utilisateur est vérifié AVANT l'envoi de la requête
- ✅ Message d'erreur clair côté frontend si l'utilisateur n'est pas identifié
- ✅ Fallback vers headers/JWT si createdBy n'est pas fourni

## Tests

Pour tester:

1. Se connecter en tant que commercial
2. Créer une activité avec linkType='' (Aucun)
3. Vérifier que l'activité est créée avec `created_by` et `assigned_to` remplis
4. Vérifier dans les logs frontend:
   - `💾 [SAVE_ACTIVITY] UserId résolu: <id>`
   - `📝 [SAVE_ACTIVITY] Ajout createdBy: <id>`
   - `📤 [SAVE_ACTIVITY] Envoi des données d'activité: { createdBy: <id>, ... }`
5. Vérifier dans les logs backend:
   - `📨 Requête CREATE activité reçue: { dto: { createdBy: <id>, assignedTo: <id> } }`
   - `✅ CreatedBy fourni dans DTO: <id>`
   - `✅ ID utilisateur final: <id>`

## Références

- Contrôleur similaire: `src/controllers/crm/opportunity.controller.ts` (utilise le même pattern)
- Entity: `src/crm/entities/activity.entity.ts`
- DTO: `src/crm/dto/create-activity.dto.ts`
