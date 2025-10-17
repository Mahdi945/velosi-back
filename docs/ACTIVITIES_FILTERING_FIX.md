# Correction du filtrage des activités pour les commerciaux

**Date:** 17 octobre 2025  
**Problème:** Les activités ne s'affichent pas dans la page Activities pour les commerciaux, alors qu'elles s'affichent correctement dans le calendrier

## 🔍 Diagnostic

### Symptômes
- ✅ **Page Calendrier**: Affiche 4 activités pour le commercial
- ❌ **Page Activities**: N'affiche aucune activité (0 activités)
- ✅ Plus d'erreur 401 (résolu précédemment)

### Comparaison du comportement

#### ✅ Calendrier (FONCTIONNEL)
```typescript
// Dans calendar.component.ts - ngOnInit()
if (this.isCommercial && this.currentUser.id) {
  this.filters.assignedTo = typeof this.currentUser.id === 'string' 
    ? parseInt(this.currentUser.id) 
    : this.currentUser.id;
}
```
**Stratégie**: Envoie le filtre `assignedTo` au backend

#### ❌ Activities (PROBLÉMATIQUE - AVANT FIX)
```typescript
// Filtrage côté client complexe
if (this.isCommercial && !this.isAdmin && this.currentUser) {
  // Filtre seulement les activités liées à des leads/opportunities du commercial
  // MAIS ignore les activités directement assignées au commercial
  this.activities = this.allActivities.filter(activity => {
    if (activity.leadId) {
      const lead = this.allLeads.find(l => l.id === activity.leadId);
      return lead && lead.assignedToId === currentCommercial.id;
    }
    if (activity.opportunityId) {
      const opportunity = this.allOpportunities.find(o => o.id === activity.opportunityId);
      return opportunity && opportunity.assignedToId === currentCommercial.id;
    }
    return false; // ❌ PROBLÈME: Ignore les activités directement assignées
  });
}
```
**Stratégie**: Filtrage côté client (plus complexe et incomplet)

## 🐛 Cause du problème

Le filtrage côté client avait 2 problèmes :

1. **Logique incomplète** : Ne prenait pas en compte `activity.assignedTo`
2. **Approche différente** : Le calendrier filtre côté backend, Activities filtrait côté client

## ✅ Solution appliquée

### 1. Ajout du filtre dans ngOnInit()

**Fichier:** `activities.component.ts`

```typescript
async ngOnInit(): Promise<void> {
  await this.loadCurrentUser();
  
  // ✅ NOUVEAU: Si commercial, définir le filtre assignedTo AVANT de charger
  if (this.isCommercial && !this.isAdmin && this.currentUser?.id) {
    const userId = typeof this.currentUser.id === 'string' 
      ? parseInt(this.currentUser.id) 
      : this.currentUser.id;
    this.filters.assignedTo = userId;
    this.filterCommercialId = userId;
    console.log('🎯 [ACTIVITIES] Filtre commercial activé pour l\'utilisateur:', userId);
  }
  
  await Promise.all([
    this.loadCommercials(),
    this.loadLeads(),
    this.loadOpportunities()
  ]);
  
  this.loadActivities(); // Utilise filters.assignedTo
  this.loadStats();
}
```

### 2. Simplification de loadActivities()

**Avant** (filtrage côté client complexe) :
```typescript
loadActivities(): void {
  this.activitiesService.getAll(this.filters).subscribe({
    next: (data) => {
      this.allActivities = data;
      
      // ❌ Logique complexe de filtrage côté client
      if (this.isCommercial && !this.isAdmin) {
        this.activities = this.allActivities.filter(activity => {
          // Logique de filtrage manuelle...
        });
      } else {
        this.activities = this.allActivities;
      }
      
      this.filteredActivities = this.activities;
    }
  });
}
```

**Après** (filtrage côté backend) :
```typescript
loadActivities(): void {
  console.log('🔍 [ACTIVITIES] Filtres appliqués:', this.filters);
  
  this.loading = true;
  this.activitiesService.getAll(this.filters).subscribe({
    next: (data) => {
      console.log('📦 [ACTIVITIES] Données reçues:', data.length, 'activités');
      
      // ✅ SIMPLIFIÉ: Le backend fait déjà le filtrage via filters.assignedTo
      this.allActivities = data;
      this.activities = data;
      
      // Tri décroissant par ID
      this.activities.sort((a, b) => (b.id || 0) - (a.id || 0));
      
      this.filteredActivities = this.activities;
      this.loading = false;
    }
  });
}
```

## 🎯 Avantages de la nouvelle approche

### 1. **Cohérence avec le Calendrier**
- Même logique de filtrage
- Même endpoint API (`/api/crm/activities`)
- Même paramètre (`filters.assignedTo`)

### 2. **Simplicité**
- Moins de code côté client
- Pas besoin de charger les leads/opportunities pour filtrer
- Le backend fait le travail (plus performant)

### 3. **Fiabilité**
- Le backend utilise TypeORM avec jointures
- Garantit que toutes les activités assignées sont récupérées
- Pas de risque de filtrage incomplet

### 4. **Performance**
- Moins de données transférées (seulement les activités pertinentes)
- Moins de traitement côté client
- Pas besoin de filtrer des tableaux en JavaScript

## 📊 Résultat attendu

Pour un commercial avec 4 activités assignées :
- **Avant** : 0 activités affichées (filtre trop restrictif)
- **Après** : 4 activités affichées ✅

## 🔍 Backend - Comment le filtrage fonctionne

**Fichier:** `activities.service.ts` (backend)

```typescript
async findAll(filters?: FilterActivityDto): Promise<Activity[]> {
  const queryBuilder = this.activityRepository
    .createQueryBuilder('activity')
    .leftJoinAndSelect('activity.assignedToPersonnel', 'assignedToPersonnel')
    .leftJoinAndSelect('activity.lead', 'lead')
    .leftJoinAndSelect('activity.opportunity', 'opportunity')
    // ... autres jointures

  // ✅ Filtre par commercial assigné
  if (filters.assignedTo) {
    queryBuilder.andWhere('activity.assignedTo = :assignedTo', {
      assignedTo: filters.assignedTo,
    });
  }

  return queryBuilder.getMany();
}
```

## 📝 Logs de débogage

Les nouveaux logs permettent de suivre le processus :

```
🔐 [ACTIVITIES] Token dans localStorage: ...
👤 [ACTIVITIES] Utilisateur: commercial_test
🎭 [ACTIVITIES] Rôles - Admin: false, Commercial: true
🎯 [ACTIVITIES] Filtre commercial activé pour l'utilisateur: 5
🔍 [ACTIVITIES] Filtres appliqués: { assignedTo: 5 }
📦 [ACTIVITIES] Données reçues: 4 activités
📊 [ACTIVITIES] Activités finales après tri: 4
```

## ✅ Points de vérification

- [ ] Les activités s'affichent pour les commerciaux (4 activités dans cet exemple)
- [ ] Les administratifs voient toutes les activités
- [ ] Le tri par date fonctionne correctement
- [ ] Pas d'erreur dans la console
- [ ] Cohérence avec le calendrier

## 🔗 Fichiers modifiés

1. `src/app/components/crm/activities/activities/activities.component.ts`
   - Ajout du filtre `assignedTo` dans `ngOnInit()`
   - Simplification de `loadActivities()`
   - Ajout de logs de débogage

## 📚 Documentation connexe

- `ACTIVITIES_AUTH_FIX.md` - Correction de l'erreur 401
- Code source du calendrier pour référence

## 🎓 Leçons apprises

1. **Privilégier le filtrage backend** quand c'est possible
2. **Maintenir la cohérence** entre les différentes pages
3. **Utiliser les logs** pour déboguer efficacement
4. **Simplifier le code** en déléguant au backend
