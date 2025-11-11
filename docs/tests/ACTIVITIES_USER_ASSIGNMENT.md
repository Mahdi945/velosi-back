# 📋 Gestion de l'assignation utilisateur dans les activités

## 🎯 Objectif

Assurer que chaque activité créée est correctement assignée à un utilisateur, avec une gestion différente selon le rôle (commercial ou admin).

## 🔧 Modifications Backend

### Controller (`activities.controller.ts`)

#### Récupération de l'utilisateur connecté
```typescript
// Priorité: JWT user > header X-User-Id
let userId: number | undefined;

if (req.user && req.user.id) {
  userId = req.user.id;
  console.log('👤 Utilisateur authentifié via JWT:', { id: userId, username: req.user.username });
} else if (req.headers['x-user-id']) {
  const headerUserId = parseInt(req.headers['x-user-id'] as string, 10);
  if (!isNaN(headerUserId) && headerUserId > 0) {
    userId = headerUserId;
    console.log('👤 Utilisateur récupéré depuis header X-User-Id:', userId);
  }
}

if (!userId) {
  throw new BadRequestException('Impossible de déterminer l\'utilisateur connecté. Veuillez vous reconnecter.');
}
```

#### Assignation automatique
```typescript
// createdBy: toujours l'utilisateur connecté
if (!createActivityDto.createdBy) {
  createActivityDto.createdBy = userId;
}

// assignedTo: utilisateur connecté par défaut (peut être écrasé par le DTO)
if (!createActivityDto.assignedTo) {
  createActivityDto.assignedTo = userId;
}
```

## 🎨 Modifications Frontend

### Interface utilisateur selon le rôle

#### 1. Pour les COMMERCIAUX (linkType = '' ou Aucun)

**Message informatif au lieu d'autocomplete:**
```html
<div class="alert alert-info mb-0">
  <div class="d-flex align-items-center">
    <i class="ti ti-info-circle fs-4 me-3"></i>
    <div>
      <strong class="d-block">Cette activité vous sera automatiquement assignée</strong>
      <small class="text-muted">
        En tant que commercial, vous serez le responsable de cette activité
      </small>
    </div>
  </div>
</div>
```

**Logique TypeScript:**
```typescript
if (this.isCommercial && !this.isAdmin) {
  // Ne pas définir assignedToId
  // Le backend l'assignera automatiquement à l'utilisateur connecté
  assignedToId = undefined;
}
```

#### 2. Pour les ADMINS (linkType = '' ou Aucun)

**Autocomplete pour choisir un commercial:**
- Affichage d'un champ de recherche
- Liste déroulante des commerciaux actifs
- Possibilité de sélectionner n'importe quel commercial

**Logique TypeScript:**
```typescript
if (this.isAdmin && this.selectedCommercial?.id) {
  assignedToId = this.selectedCommercial.id;
}
```

#### 3. Pour tous (linkType = 'lead', 'opportunity', 'client')

L'activité est assignée automatiquement au commercial responsable de l'entité liée:
- **Prospect**: commercial assigné au prospect
- **Opportunité**: commercial assigné à l'opportunité
- **Client**: l'activité est liée au client

## 🔄 Flux complet

### Commercial créant une activité sans liaison

1. **Frontend**: 
   - Affiche le message informatif
   - Ne définit PAS `assignedTo` dans la requête
   - Envoie l'activité au backend

2. **Backend**:
   - Récupère l'ID utilisateur depuis JWT ou header `X-User-Id`
   - Assigne automatiquement `createdBy = userId`
   - Assigne automatiquement `assignedTo = userId`
   - Sauvegarde l'activité

3. **Résultat**: L'activité est créée et assignée au commercial connecté

### Admin créant une activité sans liaison

1. **Frontend**:
   - Affiche l'autocomplete des commerciaux
   - L'admin sélectionne un commercial
   - Envoie `assignedTo = selectedCommercial.id` au backend

2. **Backend**:
   - Récupère l'ID admin depuis JWT ou header
   - Assigne `createdBy = adminId`
   - Garde `assignedTo = selectedCommercial.id` (fourni par le frontend)
   - Sauvegarde l'activité

3. **Résultat**: L'activité est créée par l'admin et assignée au commercial choisi

### Tous: Activité liée à un prospect/opportunité

1. **Frontend**:
   - Détecte le `linkType` ('lead', 'opportunity', 'client')
   - Récupère automatiquement l'`assignedToId` de l'entité liée
   - Envoie cet `assignedTo` au backend

2. **Backend**:
   - Assigne `createdBy = userId` (utilisateur connecté)
   - Garde `assignedTo` fourni par le frontend
   - Sauvegarde l'activité

3. **Résultat**: L'activité hérite du commercial responsable de l'entité liée

## ✅ Avantages

1. **Simplicité pour les commerciaux**: Pas besoin de se sélectionner manuellement
2. **Flexibilité pour les admins**: Peuvent assigner à n'importe quel commercial
3. **Cohérence**: Les activités liées héritent du commercial responsable
4. **Sécurité**: L'utilisateur connecté est toujours tracé via `createdBy`

## 🚨 Points d'attention

- Le champ `createdBy` est **obligatoire** en base de données
- Le backend vérifie la présence d'un utilisateur connecté
- Si JWT désactivé, utilise le header `X-User-Id`
- En cas d'absence d'utilisateur, retourne une erreur 400

## 📝 Champs de la base de données

```sql
-- Champ obligatoire
created_by INTEGER NOT NULL -- ID de l'utilisateur qui a créé l'activité

-- Champ optionnel (peut être NULL)
assigned_to INTEGER NULL -- ID du commercial assigné à l'activité
```

## 🔗 Fichiers modifiés

### Backend
- `src/crm/activities.controller.ts` - Logique d'assignation

### Frontend
- `src/app/components/crm/activities/activities/activities.component.ts` - Logique selon rôle
- `src/app/components/crm/activities/activities/activities.component.html` - UI différente selon rôle

---

**Date**: 17/10/2025  
**Version**: 1.0.0
