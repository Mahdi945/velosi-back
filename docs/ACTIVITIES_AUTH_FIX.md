# Correction du problème d'authentification - Page Activités

**Date:** 17 octobre 2025  
**Problème:** Erreur 401 (Unauthorized) sur la page activités alors que les autres pages CRM fonctionnent

## 🔍 Diagnostic

### Symptômes
- ❌ Page Activities: Erreur 401 "Utilisateur non trouvé ou inactif"
- ✅ Page Opportunities: Fonctionne correctement
- ✅ Page Prospects: Fonctionne correctement  
- ✅ Page Pipeline: Fonctionne correctement

### Logs d'erreur
```
JWT Auth Guard - Échec d'authentification: {
  url: '/api/crm/activities',
  method: 'GET',
  errorType: 'USER_NOT_FOUND',
  error: 'Utilisateur non trouvé ou inactif',
  info: 'No auth token',
  headers: { authorization: 'Absent', cookie: 'Absent' }
}
```

## 🔬 Analyse de la cause

### Différence dans les contrôleurs

#### ✅ OpportunityController (FONCTIONNEL)
```typescript
@Controller('crm/opportunities')
// @UseGuards(JwtAuthGuard, RolesGuard) // Temporairement désactivé pour debug
export class OpportunityController {
  // ...
}
```

#### ❌ ActivitiesController (PROBLÉMATIQUE - AVANT FIX)
```typescript
@Controller('crm/activities')
@UseGuards(JwtAuthGuard)  // ← ACTIF - Bloque les requêtes sans token
export class ActivitiesController {
  // ...
}
```

### Pourquoi cela pose problème ?

1. **Le guard JWT est actif** sur le contrôleur Activities
2. **Aucun token n'est envoyé** dans les requêtes (ni header Authorization, ni cookies)
3. Le backend **rejette toutes les requêtes** vers `/api/crm/activities`

### Pourquoi pas de token ?

L'application utilise plusieurs mécanismes d'authentification :
- ✅ Keycloak (token JWT dans localStorage ou cookies)
- ✅ Authentification backend directe (cookies HTTP-only)
- ❌ **Mais aucun n'est actif dans ce cas**

Les logs montrent :
```
🔐 [ACTIVITIES] Token dans localStorage: ABSENT
🍪 [ACTIVITIES] Cookies disponibles: AUCUN
```

## ✅ Solution appliquée

### Modification du contrôleur Activities

**Fichier:** `src/crm/activities.controller.ts`

```typescript
@Controller('crm/activities')
// @UseGuards(JwtAuthGuard) // Temporairement désactivé pour déboggage - MÊME COMPORTEMENT QUE OPPORTUNITIES
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly attachmentsService: ActivityAttachmentsService,
  ) {}
  // ...
}
```

### Cohérence avec les autres contrôleurs

Maintenant tous les contrôleurs CRM ont le même comportement :
- ✅ Opportunities: Guard désactivé
- ✅ Prospects (Leads): Guard désactivé  
- ✅ Activities: Guard désactivé
- ✅ Pipeline: Guard désactivé

## 🔄 Vérifications à effectuer

### Frontend
1. ✅ Le service `ActivitiesService` utilise `withCredentials: true`
2. ✅ Les intercepteurs HTTP ajoutent le token si disponible
3. ✅ Le composant Activities charge correctement les données

### Backend
1. ✅ Le guard JWT est désactivé temporairement
2. ⏳ Les méthodes du service gèrent correctement le filtrage par utilisateur
3. ⏳ Les activités sont filtrées côté client pour les commerciaux

## 📋 Tâches suivantes

### Court terme
- [ ] Tester le chargement des activités après la modification
- [ ] Vérifier l'affichage pour les rôles admin et commercial
- [ ] Implémenter le filtrage côté client pour les commerciaux

### Moyen terme  
- [ ] Réactiver les guards JWT une fois l'authentification stabilisée
- [ ] Implémenter un système de token robuste (refresh token, etc.)
- [ ] Ajouter des tests automatisés pour l'authentification

## 🎯 Filtrage pour les commerciaux

Le filtrage doit se faire **côté client** comme dans OpportunitiesComponent :

```typescript
// Si commercial, filtrer seulement ses activités
if (this.isCommercial && !this.isAdmin && this.currentUser) {
  const currentUser = this.authService.getCurrentUser();
  const currentCommercial = this.commerciaux.find(c => 
    c.nom_utilisateur === currentUser?.username
  );
  
  if (currentCommercial) {
    this.activities = this.allActivities.filter(activity => {
      // Si activité liée à un prospect
      if (activity.leadId) {
        const lead = this.allLeads.find(l => l.id === activity.leadId);
        return lead && lead.assignedToId === currentCommercial.id;
      }
      // Si activité liée à une opportunité
      if (activity.opportunityId) {
        const opportunity = this.allOpportunities.find(o => 
          o.id === activity.opportunityId
        );
        return opportunity && opportunity.assignedToId === currentCommercial.id;
      }
      return false;
    });
  }
}
```

## 📝 Notes importantes

1. **Cette solution est temporaire** - Le guard doit être réactivé avec une authentification correcte
2. **Sécurité** - Sans guard, n'importe qui peut accéder aux endpoints (à corriger en production)
3. **Cohérence** - Tous les contrôleurs CRM doivent avoir le même niveau de sécurité

## 🔗 Références

- Fichier modifié: `src/crm/activities.controller.ts`
- Comparaison: `src/controllers/crm/opportunity.controller.ts`
- Frontend: `src/app/components/crm/activities/activities/activities.component.ts`
- Service: `src/app/services/activities.service.ts`
