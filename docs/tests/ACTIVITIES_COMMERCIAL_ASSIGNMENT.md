# Assignation Commercial pour les Activités "Aucun"

**Date**: 17/10/2025  
**Feature**: Gestion de l'assignation commercial pour le type de liaison "Aucun"

## Fonctionnalité

Pour les activités avec `linkType = ''` (Aucun), le comportement de l'assignation commerciale diffère selon:
- Le rôle de l'utilisateur (Commercial vs Admin)
- Le mode (Création vs Modification)

## Comportements détaillés

### 1. Commercial en mode CRÉATION

**Affichage**: Message informatif indiquant l'auto-assignation

```html
<div class="alert alert-info">
  <strong>Cette activité vous sera automatiquement assignée</strong>
  <small>En tant que commercial, vous serez le responsable de cette activité</small>
</div>
```

**Logique backend**: L'activité est automatiquement assignée à l'utilisateur connecté

### 2. Commercial en mode MODIFICATION

**Affichage**: Select désactivé montrant le commercial actuellement assigné

```html
<select class="form-select" [(ngModel)]="activityForm.assignedToId" disabled>
  <option>{{ nom du commercial assigné }}</option>
</select>
<small class="text-muted">
  En tant que commercial, vous ne pouvez pas modifier l'assignation
</small>
```

**Logique**: Le commercial ne peut pas changer l'assignation, mais peut modifier les autres champs

### 3. Admin en mode CRÉATION

**Affichage**: Autocomplete pour rechercher et sélectionner un commercial

```html
<input type="text" 
       [(ngModel)]="commercialSearchTerm"
       (input)="filterCommercials()"
       placeholder="Rechercher un commercial...">
<!-- Dropdown avec liste des commerciaux filtrés -->
```

**Logique**: L'admin choisit explicitement le commercial via l'autocomplete

### 4. Admin en mode MODIFICATION

**Affichage**: Select pré-rempli avec tous les commerciaux disponibles

```html
<select class="form-select" [(ngModel)]="activityForm.assignedToId">
  <option *ngFor="let commercial of commerciaux" [value]="commercial.id">
    {{ commercial.prenom }} {{ commercial.nom }}
  </option>
</select>
<small class="text-muted">
  Vous pouvez modifier le commercial assigné
</small>
```

**Logique**: L'admin peut changer le commercial assigné en sélectionnant dans la liste

## Code TypeScript

### Logique de sauvegarde

```typescript
// Dans saveActivity()
else if (this.activityForm.linkType === '' || !this.activityForm.linkType) {
  if (this.isAdmin) {
    if (this.selectedActivity) {
      // Mode édition: utiliser la valeur du select
      assignedToId = this.activityForm.assignedToId;
    } else if (this.selectedCommercial?.id) {
      // Mode création: utiliser l'autocomplete
      assignedToId = this.selectedCommercial.id;
    }
  } else if (this.isCommercial && !this.isAdmin) {
    if (this.selectedActivity) {
      // Mode édition: garder l'assignation existante
      assignedToId = this.activityForm.assignedToId;
    } else {
      // Mode création: laisser vide, sera auto-assigné par le backend
      assignedToId = undefined;
    }
  }
}
```

### Initialisation en mode édition

```typescript
// Dans openEditActivityModal()
this.activityForm = {
  // ... autres champs
  assignedToId: activity.assignedTo || null, // ✅ Pré-remplir avec le commercial actuel
  linkType: linkType,
  // ...
};
```

## Template HTML

### Structure conditionnelle

```html
<div class="col-md-6" *ngIf="activityForm.linkType === '' || !activityForm.linkType">
  <label>Commercial assigné</label>
  
  <!-- Commercial en CRÉATION -->
  <div *ngIf="isCommercial && !isAdmin && !selectedActivity">
    Message informatif d'auto-assignation
  </div>
  
  <!-- Commercial en MODIFICATION -->
  <div *ngIf="isCommercial && !isAdmin && selectedActivity">
    Select désactivé avec commercial actuel
  </div>
  
  <!-- Admin en CRÉATION -->
  <div *ngIf="isAdmin && !selectedActivity">
    Autocomplete pour choisir un commercial
  </div>
  
  <!-- Admin en MODIFICATION -->
  <div *ngIf="isAdmin && selectedActivity">
    Select modifiable avec liste des commerciaux
  </div>
</div>
```

## Cas d'usage

### Scénario 1: Commercial crée une activité personnelle
1. Sélectionne "Aucun" comme type de liaison
2. Voit le message d'auto-assignation
3. Remplit les autres champs
4. Sauvegarde → L'activité lui est automatiquement assignée

### Scénario 2: Admin crée une activité pour un commercial
1. Sélectionne "Aucun" comme type de liaison
2. Recherche et sélectionne un commercial via l'autocomplete
3. Remplit les autres champs
4. Sauvegarde → L'activité est assignée au commercial choisi

### Scénario 3: Admin modifie une activité existante
1. Ouvre une activité avec linkType "Aucun"
2. Voit le commercial actuellement assigné dans le select
3. Peut changer le commercial en sélectionnant un autre dans la liste
4. Sauvegarde → L'activité est réassignée au nouveau commercial

### Scénario 4: Commercial modifie son activité
1. Ouvre une activité qui lui est assignée
2. Voit son nom dans un select désactivé
3. Ne peut pas changer l'assignation
4. Peut modifier les autres champs (titre, description, date, etc.)
5. Sauvegarde → L'assignation reste inchangée

## Avantages de cette approche

✅ **Clarté**: Le commercial comprend immédiatement qu'il sera assigné  
✅ **Flexibilité**: L'admin peut assigner n'importe quel commercial  
✅ **Sécurité**: Le commercial ne peut pas se désassigner ou réassigner à quelqu'un d'autre  
✅ **Transparence**: En modification, tout le monde voit clairement qui est assigné  
✅ **UX cohérente**: Utilise autocomplete en création et select en modification (plus simple)

## Notes techniques

- `selectedActivity` est utilisé pour déterminer le mode (création vs modification)
- `activityForm.assignedToId` stocke l'ID du commercial assigné
- Le select en modification charge la liste complète des `commerciaux[]`
- L'autocomplete en création filtre dynamiquement la liste avec `filterCommercials()`
