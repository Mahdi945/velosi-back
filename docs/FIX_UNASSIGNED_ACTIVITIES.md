# Correction : Activités Non Assignées

## Date : 17 octobre 2025

## Problème identifié

Les activités créées sans commercial assigné étaient automatiquement assignées au créateur de l'activité (souvent un administratif), ce qui est incorrect.

### Symptômes
- Une activité créée par un administratif montre l'administratif comme "Commercial Assigné"
- Le champ "Commercial Assigné" ne peut pas être vide
- Confusion entre créateur (qui peut être n'importe qui) et commercial assigné (qui doit être un commercial)

## Cause racine

### 1. **Backend - Entité TypeORM**
```typescript
// AVANT (❌ Incorrect)
@Column({ name: 'assigned_to' })
assignedTo: number;  // Non nullable
```

La colonne n'était pas nullable, forçant une valeur.

### 2. **Backend - Controller**
```typescript
// AVANT (❌ Incorrect)
if (!createActivityDto.assignedTo) {
  createActivityDto.assignedTo = userId;  // Assigne automatiquement au créateur
}
```

Le controller assignait automatiquement l'activité au créateur si non spécifié.

### 3. **Base de données**
La colonne `assigned_to` dans la table `crm_activities` était définie comme `NOT NULL`.

## Solution appliquée

### 1. ✅ Backend - Entité TypeORM mise à jour

**Fichier** : `velosi-back/src/crm/entities/activity.entity.ts`

```typescript
// APRÈS (✅ Correct)
@Column({ name: 'assigned_to', nullable: true })
assignedTo: number;

@ManyToOne(() => Personnel, { eager: true, nullable: true })
@JoinColumn({ name: 'assigned_to' })
assignedToPersonnel: Personnel;
```

### 2. ✅ Backend - Controller corrigé

**Fichier** : `velosi-back/src/crm/activities.controller.ts`

```typescript
// APRÈS (✅ Correct)
@Post()
@HttpCode(HttpStatus.CREATED)
create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
  const userId = req.user?.id || req.user?.userId;
  
  // Définir le créateur
  if (!createActivityDto.createdBy) {
    createActivityDto.createdBy = userId;
  }
  
  // ⚠️ NE PAS assigner automatiquement
  // L'activité peut rester non assignée (assignedTo = null)
  // Elle sera assignée uniquement si explicitement fourni dans le DTO
  
  return this.activitiesService.create(createActivityDto);
}
```

### 3. ✅ Frontend - Modal de détails

**Fichier** : `calendar.component.html`

```html
<!-- Affichage conditionnel -->
<div class="d-flex align-items-center">
  <div class="avatar avatar-sm rounded-circle me-2"
       [ngClass]="selectedActivity.assignedToPersonnel ? 
                  'bg-light-primary text-primary' : 
                  'bg-light-warning text-warning'">
    <i class="ti fs-4" 
       [ngClass]="selectedActivity.assignedToPersonnel ? 
                  'ti-user' : 
                  'ti-user-question'"></i>
  </div>
  <div>
    <!-- Si assigné -->
    <div class="fw-semibold" *ngIf="selectedActivity.assignedToPersonnel">
      {{ selectedActivity.assignedToPersonnel?.prenom }} 
      {{ selectedActivity.assignedToPersonnel?.nom }}
    </div>
    
    <!-- Si pas assigné -->
    <div class="fw-semibold text-warning" *ngIf="!selectedActivity.assignedToPersonnel">
      <i class="ti ti-alert-circle me-1"></i>Pas encore assigné
    </div>
  </div>
</div>
```

### 4. ✅ Frontend - Modal d'édition

**Fichier** : `calendar.component.ts`

```typescript
openEditActivityModal(activity: Activity | null): void {
  if (!activity) return;

  this.editingActivity = {
    // ... autres champs
    
    // ✅ Si pas de personnel assigné, mettre null (pas le créateur)
    assignedTo: activity.assignedToPersonnel ? activity.assignedTo : null,
    
    // ... autres champs
  };
}
```

**Select dans le formulaire** :
```html
<select class="form-select" [(ngModel)]="editingActivity.assignedTo" name="assignedTo">
  <option [ngValue]="null">Pas encore assigné</option>
  <option *ngFor="let commercial of commercials" [ngValue]="commercial.id">
    {{ commercial.prenom }} {{ commercial.nom }}
  </option>
</select>
```

### 5. ✅ Migration de base de données

**Fichier** : `migrations/make-assigned-to-nullable.sql`

```sql
-- Rendre la colonne nullable
ALTER TABLE crm_activities 
MODIFY COLUMN assigned_to INT NULL;
```

## Différence importante

### Concept 1 : Créateur (`createdBy`)
- **Qui** : La personne qui a créé l'activité
- **Peut être** : Admin, administratif, commercial, etc.
- **Toujours renseigné** : Oui (requis)

### Concept 2 : Commercial Assigné (`assignedTo`)
- **Qui** : Le commercial responsable de l'activité
- **Peut être** : Uniquement un commercial
- **Toujours renseigné** : Non (optionnel)

### Exemples

**Exemple 1 : Activité créée par un admin**
```json
{
  "createdBy": 1,          // Admin ID 1
  "creator": {
    "id": 1,
    "nom": "Dupont",
    "prenom": "Admin",
    "role": "administratif"
  },
  "assignedTo": null,      // ✅ Pas encore assigné
  "assignedToPersonnel": null
}
```
- **Créé par** : Admin Dupont
- **Assigné à** : Pas encore assigné ⚠️

**Exemple 2 : Activité assignée à un commercial**
```json
{
  "createdBy": 1,          // Admin ID 1
  "creator": {
    "id": 1,
    "nom": "Dupont",
    "prenom": "Admin"
  },
  "assignedTo": 3,         // Commercial ID 3
  "assignedToPersonnel": {
    "id": 3,
    "nom": "Martin",
    "prenom": "Jean",
    "role": "commercial"
  }
}
```
- **Créé par** : Admin Dupont
- **Assigné à** : Jean Martin (Commercial) ✅

## Instructions de déploiement

### Étape 1 : Arrêter le backend
```bash
# Arrêter le serveur NestJS
```

### Étape 2 : Exécuter la migration SQL
```bash
mysql -u root -p velosi_db < migrations/make-assigned-to-nullable.sql
```

### Étape 3 : Démarrer le backend
```bash
cd velosi-back
npm run start:dev
```

### Étape 4 : Tester

**Test 1 : Créer une activité sans assignation**
1. Se connecter en tant qu'admin ou administratif
2. Créer une nouvelle activité
3. Dans le champ "Commercial Assigné", sélectionner "Pas encore assigné"
4. Enregistrer
5. **Résultat attendu** : L'activité est créée sans commercial assigné

**Test 2 : Visualiser une activité non assignée**
1. Ouvrir les détails de l'activité créée
2. **Résultat attendu** : 
   - Section "Créé par" montre l'admin/administratif
   - Section "Assigné à" montre "Pas encore assigné" avec icône orange

**Test 3 : Assigner un commercial**
1. Modifier l'activité non assignée
2. Sélectionner un commercial dans le select
3. Enregistrer
4. **Résultat attendu** : L'activité est maintenant assignée au commercial sélectionné

**Test 4 : Filtrer par commercial**
1. Utiliser le filtre "Commercial" dans le calendrier
2. **Résultat attendu** : 
   - Les activités assignées à ce commercial s'affichent
   - Les activités non assignées n'apparaissent pas dans le filtre d'un commercial spécifique

## Nettoyage des données existantes (Optionnel)

Si vous voulez nettoyer les activités existantes qui ont été incorrectement assignées au créateur :

```sql
-- Identifier les activités incorrectement assignées
SELECT 
    a.id,
    a.title,
    a.assigned_to,
    a.created_by,
    p1.nom as createur_nom,
    p1.role as createur_role
FROM crm_activities a
LEFT JOIN personnel p1 ON a.created_by = p1.id
WHERE a.assigned_to = a.created_by
  AND p1.role IN ('administratif', 'admin', 'administrator');

-- Mettre à NULL les assignations incorrectes
UPDATE crm_activities a
LEFT JOIN personnel p ON a.assigned_to = p.id
SET a.assigned_to = NULL
WHERE a.assigned_to = a.created_by
  AND p.role IN ('administratif', 'admin', 'administrator');
```

⚠️ **Attention** : Cette opération modifie les données existantes. Faites une sauvegarde avant !

## Fichiers modifiés

### Backend
1. `src/crm/entities/activity.entity.ts` - Colonne nullable
2. `src/crm/activities.controller.ts` - Suppression de l'assignation automatique
3. `migrations/make-assigned-to-nullable.sql` - Migration SQL

### Frontend
1. `calendar.component.html` - Affichage "Pas encore assigné"
2. `calendar.component.ts` - Logique d'édition corrigée

## Impact sur les autres parties du système

### ✅ Aucun impact négatif attendu
- Le DTO `CreateActivityDto` avait déjà `assignedTo` en optionnel
- Le DTO `FilterActivityDto` gère correctement les valeurs null
- Les relations TypeORM sont maintenant nullable

### ⚠️ Points d'attention
- Les rapports ou statistiques qui comptent les activités par commercial doivent gérer le cas `null`
- Les dashboards doivent afficher une catégorie "Non assignées"

## Améliorations futures possibles

1. **Dashboard d'activités non assignées**
   - Afficher un compteur d'activités en attente d'assignation
   - Permettre l'assignation rapide depuis une liste

2. **Notifications**
   - Notifier les admins des activités non assignées depuis X jours
   - Suggérer des commerciaux en fonction du type d'activité

3. **Règles d'auto-assignation**
   - Assigner automatiquement selon le type de client
   - Round-robin entre commerciaux disponibles

4. **Historique d'assignation**
   - Tracker qui a assigné l'activité et quand
   - Afficher les réassignations

## Conclusion

✅ **Problème résolu** : Les activités peuvent maintenant être créées sans commercial assigné

✅ **Distinction claire** : 
- **Créateur** = Qui a créé l'activité (peut être n'importe qui)
- **Commercial Assigné** = Qui doit gérer l'activité (uniquement commerciaux, optionnel)

✅ **UX améliorée** : Affichage clair avec "Pas encore assigné" en orange

🎉 **Le système gère maintenant correctement les activités non assignées !**
