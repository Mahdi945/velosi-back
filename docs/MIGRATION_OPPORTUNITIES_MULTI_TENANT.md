# 🔄 Migration Opportunity Service vers Multi-Tenant

## ✅ Modifications Effectuées

### 1. **opportunity.service.ts** - Refactorisation complète
- ❌ **AVANT**: Utilisation de TypeORM avec `@InjectRepository` et `Repository<T>`
- ✅ **APRÈS**: Utilisation de `DatabaseConnectionService` avec requêtes SQL directes

#### Changements Principaux:

**Injection de dépendances:**
```typescript
// AVANT
constructor(
  @InjectRepository(Opportunity)
  private opportunityRepository: Repository<Opportunity>,
  @InjectRepository(Lead)
  private leadRepository: Repository<Lead>,
  ...
) {}

// APRÈS
constructor(
  private databaseConnectionService: DatabaseConnectionService,
) {}
```

**Signature des méthodes (ajout de databaseName et organisationId):**
```typescript
// AVANT
async create(createOpportunityDto: CreateOpportunityDto, userId: number)

// APRÈS
async create(databaseName: string, organisationId: number, createOpportunityDto: CreateOpportunityDto, userId: number)
```

**Méthodes refactorisées:**
- ✅ `transformOpportunityToCamelCase()` - Nouvelle méthode pour transformer snake_case → camelCase
- ✅ `create()` - Création avec requête SQL INSERT
- ✅ `findAll()` - Récupération avec filtres et pagination (NON-ARCHIVÉES)
- ✅ `findAllArchived()` - Récupération des opportunités archivées
- ✅ `findOne()` - Récupération d'une seule opportunité
- ✅ `update()` - Mise à jour dynamique avec requête SQL UPDATE
- ✅ `remove()` - Suppression avec requête SQL DELETE
- ✅ **`convertFromLead()`** - **NOUVELLE MÉTHODE** pour conversion prospect → opportunité
- ✅ `getStats()` - Statistiques multi-tenant
- ✅ `archiveOpportunity()` - Archivage multi-tenant
- ✅ `restoreOpportunity()` - Restauration multi-tenant

### 2. **opportunity.controller.ts** - Mise à jour complète

#### Changements Principaux:

**Import du helper multi-tenant:**
```typescript
import { getDatabaseName, getOrganisationId } from '../../common/helpers/multi-tenant.helper';
```

**Activation des guards:**
```typescript
@Controller('crm/opportunities')
@UseGuards(JwtAuthGuard)  // ✅ Réactivé
export class OpportunityController {
```

**Toutes les routes mises à jour:**
```typescript
// Exemple pour findAll()
@Get()
async findAll(@Query() query: OpportunityQueryDto, @Req() req) {
  const databaseName = getDatabaseName(req);
  const organisationId = getOrganisationId(req);
  
  const result = await this.opportunityService.findAll(databaseName, organisationId, query);
  // ...
}
```

**Nouvelles routes ajoutées:**
- ✅ `POST /:id/archive` - Archiver une opportunité
- ✅ `POST /:id/restore` - Restaurer une opportunité archivée

### 3. **Fonction convertFromLead** - IMPLÉMENTÉE ✅

La méthode `convertFromLead()` est maintenant disponible dans opportunity.service.ts et est appelée par:
1. **Frontend** via `temp-conversion-method.ts`
2. **Backend leads.service.ts** via la méthode `convertToOpportunity()`

**Fonctionnalités:**
- ✅ Conversion d'un prospect en opportunité
- ✅ Gestion multi-commerciaux (assignedToIds)
- ✅ Mise à jour automatique du statut du prospect → CONVERTED
- ✅ Support multi-tenant complet
- ✅ Gestion des types de véhicules/engins

## 🔄 Architecture Multi-Tenant

### Flux de Données:

```
Frontend (JWT avec organisationId, databaseName)
   ↓
Controller (getDatabaseName, getOrganisationId)
   ↓
Service (DatabaseConnectionService)
   ↓
Base de données spécifique à l'organisation
```

### Isolation des Données:

Chaque organisation a maintenant:
- ✅ Sa propre base de données (ex: `shipnology_velosi`, `shipnology_transport_rapide`)
- ✅ Ses propres opportunités isolées
- ✅ Ses propres prospects
- ✅ Ses propres commerciaux

## 📝 Exemple d'Utilisation

### Créer une opportunité:
```typescript
POST /api/crm/opportunities
Headers: { Authorization: 'Bearer <JWT_TOKEN>' }
Body: {
  title: "Transport maritime Paris-Londres",
  description: "Client potentiel pour transport régulier",
  value: 50000,
  assignedToIds: [1, 2, 3],  // Multi-commerciaux
  stage: "qualification"
}
```

### Convertir un prospect:
```typescript
POST /api/crm/opportunities/convert-from-lead/123
Headers: { Authorization: 'Bearer <JWT_TOKEN>' }
Body: {
  opportunityTitle: "Opportunité Transport",
  opportunityDescription: "Converti depuis prospect #123",
  opportunityValue: 75000,
  assignedToIds: [1, 2]
}
```

## 🔍 Points de Vérification

- [x] opportunity.service.ts utilise DatabaseConnectionService
- [x] Toutes les méthodes acceptent databaseName et organisationId
- [x] Les requêtes SQL utilisent les bons noms de tables (crm_opportunities, crm_leads)
- [x] Transformation camelCase pour le frontend
- [x] Multi-commerciaux supportés (assigned_to_ids)
- [x] Fonction convertFromLead implémentée
- [x] opportunity.controller.ts utilise getDatabaseName/getOrganisationId
- [x] Guards réactivés (@UseGuards(JwtAuthGuard))
- [x] Routes d'archivage ajoutées
- [x] Gestion des erreurs TypeScript corrigée

## 🚀 Prochaines Étapes

1. ✅ Tester la création d'opportunités depuis différentes organisations
2. ✅ Tester la conversion de prospects en opportunités
3. ✅ Vérifier l'isolation des données entre organisations
4. ✅ Tester le filtrage par commerciaux multiples

## 📚 Fichiers Modifiés

- `velosi-back/src/services/crm/opportunity.service.ts` - Refactorisé en multi-tenant
- `velosi-back/src/controllers/crm/opportunity.controller.ts` - Mis à jour pour multi-tenant
- `velosi-back/src/services/crm/opportunity.service.old.ts` - Backup de l'ancienne version
- `velosi-back/src/controllers/crm/opportunity.controller.old.ts` - Backup de l'ancienne version

---

**Date:** 21 Décembre 2025
**Status:** ✅ COMPLÉTÉ
**Architecture:** Multi-Tenant avec isolation complète des données
