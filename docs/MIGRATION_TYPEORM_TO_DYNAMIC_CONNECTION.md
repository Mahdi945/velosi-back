# 🔧 PLAN DE MIGRATION : TypeORM Repository → Dynamic Connection

**Date:** 20 décembre 2025  
**Problème identifié:** Les services TypeORM se connectent à la base par défaut (velosi) au lieu de la base spécifiée dans le JWT (danino)  
**Solution:** Remplacer tous les TypeORM Repository par des requêtes SQL directes avec connexion dynamique

---

## 🔴 PROBLÈME CRITIQUE IDENTIFIÉ

### Log de preuve
```
✅ JWT contient: databaseName: 'danino', organisationId: 17
✅ getDatabaseName() retourne: 'danino'

❌ MAIS TypeORM Repository ignore la connexion dynamique!
   → Query: SELECT * FROM "industries" → Exécuté sur base VELOSI
   → Query: SELECT * FROM "crm_leads" → Exécuté sur base VELOSI
```

### Cause racine
TypeORM Repository est configuré avec une connexion par défaut au démarrage de l'application et ne peut pas changer de base dynamiquement par requête.

**Services concernés (utilisant Repository):**
- ❌ `industries.service.ts` → `@InjectRepository(Industry)`
- ❌ `leads.service.ts` → `@InjectRepository(Lead)`
- ❌ `opportunities.service.ts` → `@InjectRepository(Opportunity)`
- ❌ `activities.service.ts` → TypeORM QueryBuilder
- ❌ `quotes.service.ts` → `@InjectRepository(Quote)`
- ❌ Tous les autres services utilisant `@InjectRepository`

**Services fonctionnels (utilisant connection.query):**
- ✅ `engins.service.ts` → `connection.query()`
- ✅ `ports.service.ts` → `connection.query()`
- ✅ `navires.service.ts` → `connection.query()`
- ✅ `client.service.ts` (partiellement) → `connection.query()`

---

## 🎯 SOLUTION : Migration vers connexion dynamique

### Principe
**AVANT (TypeORM Repository - NE FONCTIONNE PAS):**
```typescript
@Injectable()
export class IndustryService {
  constructor(
    @InjectRepository(Industry)
    private industryRepository: Repository<Industry>,
  ) {}

  async findAll(): Promise<Industry[]> {
    // ❌ Se connecte à la base par défaut (velosi)
    return this.industryRepository.find({
      order: { libelle: 'ASC' }
    });
  }
}
```

**APRÈS (Connexion dynamique - FONCTIONNE):**
```typescript
@Injectable()
export class IndustryService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  async findAll(databaseName: string): Promise<Industry[]> {
    // ✅ Se connecte à la base spécifiée (danino)
    const connection = await this.databaseConnectionService
      .getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM industries ORDER BY libelle ASC`
    );
    
    return results;
  }
}
```

---

## 📋 SERVICES À MIGRER PAR PRIORITÉ

### 🔴 PRIORITÉ 1 - CRM (CRITIQUE)

#### 1.1 Industries Service
**Fichier:** `src/crm/services/industry.service.ts`

**État actuel:**
```typescript
@Injectable()
export class IndustryService {
  constructor(
    @InjectRepository(Industry)
    private industryRepository: Repository<Industry>,
  ) {}

  async findAll(): Promise<Industry[]> {
    return this.industryRepository.find({
      order: { libelle: 'ASC' }
    });
  }
}
```

**Migrations nécessaires:**
- [ ] Remplacer `@InjectRepository` par `DatabaseConnectionService`
- [ ] Ajouter paramètre `databaseName` à toutes les méthodes
- [ ] Convertir `repository.find()` → `connection.query()`
- [ ] Mettre à jour le controller pour passer `databaseName`
- [ ] Supprimer les imports TypeORM inutiles

#### 1.2 Leads Service
**Fichier:** `src/crm/services/leads.service.ts`

**Problème:** Mélange Repository ET connection.query()
```typescript
// ❌ PROBLÈME: Utilise les deux méthodes
constructor(
  @InjectRepository(Lead)
  private leadRepository: Repository<Lead>,
  private databaseConnectionService: DatabaseConnectionService,
) {}

// ✅ Cette méthode fonctionne (utilise connection.query)
async findAll(databaseName: string, organisationId: number) {
  const connection = await this.databaseConnectionService
    .getOrganisationConnection(databaseName);
  return connection.query(`SELECT * FROM crm_leads WHERE organisation_id = $1`, [organisationId]);
}

// ❌ Cette méthode ne fonctionne PAS (utilise Repository)
async someOtherMethod() {
  return this.leadRepository.find(); // Se connecte à velosi!
}
```

**Migrations nécessaires:**
- [ ] Identifier toutes les utilisations de `leadRepository`
- [ ] Remplacer par `connection.query()`
- [ ] Supprimer `@InjectRepository(Lead)`
- [ ] Supprimer le paramètre `organisationId` (isolation par DB)

#### 1.3 Opportunities Service
**Fichier:** `src/crm/services/opportunities.service.ts`

**Même problème que Leads**
- [ ] Migration complète vers connection.query()
- [ ] Supprimer organisationId des requêtes

#### 1.4 Activities Service
**Fichier:** `src/crm/activities.service.ts`

**Problème:** Utilise QueryBuilder
```typescript
async findAll(databaseName: string, filters: FilterActivityDto) {
  // ❌ QueryBuilder se connecte à la base par défaut
  const queryBuilder = this.activityRepository
    .createQueryBuilder('activity')
    .where('activity.type = :type', { type: filters.type });
  
  return queryBuilder.getMany();
}
```

**Migrations nécessaires:**
- [ ] Convertir tous les QueryBuilder en SQL natif
- [ ] Utiliser connection.query()
- [ ] Gérer les JOINs manuellement

#### 1.5 Quotes Service
**Fichier:** `src/crm/services/quotes.service.ts`

**Grande priorité - système de cotations**
- [ ] Migration complète Repository → connection.query()
- [ ] Attention aux relations complexes (items, frais annexes)

### 🟡 PRIORITÉ 2 - Données de référence

#### 2.1 Type Frais Annexe
**Fichier:** `src/crm/services/type-frais-annexe.service.ts`
- [ ] Migration vers connection.query()

#### 2.2 Pipeline Service
**Fichier:** `src/crm/services/pipeline.service.ts`
- [ ] Requêtes complexes avec plusieurs JOINs
- [ ] Migration délicate

### 🟢 PRIORITÉ 3 - Autres services

Tous les services utilisant `@InjectRepository` doivent être migrés.

---

## 🛠️ PROCÉDURE DE MIGRATION PAR SERVICE

### Template de migration

**1. Identifier les méthodes Repository**
```bash
# Chercher tous les usages dans le service
grep -n "this\..*Repository\." src/crm/services/industry.service.ts
```

**2. Pour chaque méthode, créer l'équivalent SQL**

| TypeORM | SQL Équivalent |
|---------|----------------|
| `repository.find()` | `SELECT * FROM table` |
| `repository.findOne({ where: { id } })` | `SELECT * FROM table WHERE id = $1` |
| `repository.save(entity)` | `INSERT INTO table (...) VALUES (...) RETURNING *` |
| `repository.update(id, data)` | `UPDATE table SET ... WHERE id = $1 RETURNING *` |
| `repository.delete(id)` | `DELETE FROM table WHERE id = $1` |
| `repository.count()` | `SELECT COUNT(*) FROM table` |

**3. Remplacer la méthode**
```typescript
// AVANT
async findAll(): Promise<Industry[]> {
  return this.industryRepository.find({
    order: { libelle: 'ASC' }
  });
}

// APRÈS
async findAll(databaseName: string): Promise<Industry[]> {
  const connection = await this.databaseConnectionService
    .getOrganisationConnection(databaseName);
  
  const results = await connection.query(
    `SELECT id, libelle, created_at, updated_at 
     FROM industries 
     ORDER BY libelle ASC`
  );
  
  return results;
}
```

**4. Mettre à jour le controller**
```typescript
// AVANT
@Get()
async findAll() {
  return this.industryService.findAll();
}

// APRÈS
@Get()
async findAll(@Request() req) {
  const databaseName = getDatabaseName(req);
  return this.industryService.findAll(databaseName);
}
```

**5. Nettoyer les imports**
```typescript
// Supprimer
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

// Garder
import { DatabaseConnectionService } from '../common/database-connection.service';
```

---

## 📝 CHECKLIST PAR SERVICE

### Industries Service
- [ ] Supprimer `@InjectRepository(Industry)`
- [ ] Injecter `DatabaseConnectionService`
- [ ] Modifier `findAll()` → ajouter `databaseName`
- [ ] Modifier `findOne()` → ajouter `databaseName`
- [ ] Modifier `create()` → ajouter `databaseName`
- [ ] Modifier `update()` → ajouter `databaseName`
- [ ] Modifier `delete()` → ajouter `databaseName`
- [ ] Mettre à jour `industry.controller.ts`
- [ ] Tester avec organisation Danino
- [ ] Tester avec organisation Velosi
- [ ] Vérifier les logs de connexion DB

### Leads Service
- [ ] Identifier méthodes utilisant `leadRepository`
- [ ] Convertir en `connection.query()`
- [ ] Supprimer `organisationId` des WHERE clauses
- [ ] Mettre à jour controller
- [ ] Tests multi-tenant

### Opportunities Service
- [ ] Même procédure que Leads
- [ ] Attention aux relations (lead_id, client_id)
- [ ] Tests multi-tenant

### Activities Service
- [ ] Convertir QueryBuilder en SQL
- [ ] Gérer les JOINs avec personnel
- [ ] Tests multi-tenant

### Quotes Service
- [ ] Migration critique (système de cotations)
- [ ] Attention aux items et frais_annexe
- [ ] Tests exhaustifs

---

## 🧪 TESTS DE VALIDATION

### Pour chaque service migré

**1. Test isolation par base**
```typescript
// Test 1: Connexion Velosi
const velosiToken = 'eyJ...'; // Token avec databaseName: 'velosi'
const velosiResults = await request(app.getHttpServer())
  .get('/api/crm/industries')
  .set('Authorization', `Bearer ${velosiToken}`)
  .expect(200);

// Test 2: Connexion Danino
const daninoToken = 'eyJ...'; // Token avec databaseName: 'danino'
const daninoResults = await request(app.getHttpServer())
  .get('/api/crm/industries')
  .set('Authorization', `Bearer ${daninoToken}`)
  .expect(200);

// Test 3: Vérifier que les données sont différentes
expect(velosiResults.body).not.toEqual(daninoResults.body);
```

**2. Vérifier les logs**
```bash
# Les logs doivent montrer la bonne connexion
✅ [DB] Connexion demandée pour: danino
✅ [DB] Connexion établie pour: danino
query: SELECT * FROM industries ORDER BY libelle ASC
```

**3. Vérifier en SQL direct**
```sql
-- Dans la base danino
SELECT COUNT(*) FROM industries;

-- Dans la base velosi
SELECT COUNT(*) FROM industries;

-- Les comptes doivent correspondre aux résultats API
```

---

## ⚠️ PIÈGES À ÉVITER

### 1. NE PAS oublier de supprimer organisation_id
```typescript
// ❌ MAUVAIS - garde le filtre organisation_id
const results = await connection.query(
  `SELECT * FROM crm_leads WHERE organisation_id = $1`,
  [organisationId]
);

// ✅ BON - l'isolation se fait par la base de données
const results = await connection.query(
  `SELECT * FROM crm_leads ORDER BY created_at DESC`
);
```

### 2. NE PAS mélanger Repository et connection
```typescript
// ❌ MAUVAIS
constructor(
  @InjectRepository(Lead) private leadRepository: Repository<Lead>,
  private databaseConnectionService: DatabaseConnectionService,
) {}

// ✅ BON - uniquement connection
constructor(
  private databaseConnectionService: DatabaseConnectionService,
) {}
```

### 3. NE PAS oublier les relations
```typescript
// ❌ MAUVAIS - oublie le JOIN
const leads = await connection.query(`SELECT * FROM crm_leads`);

// ✅ BON - inclut les relations nécessaires
const leads = await connection.query(`
  SELECT l.*, 
         p.nom as assigned_to_name, 
         p.prenom as assigned_to_prenom
  FROM crm_leads l
  LEFT JOIN personnel p ON l.assigned_to = p.id
`);
```

### 4. Gérer les transactions
```typescript
// Pour les opérations complexes
const connection = await this.databaseConnectionService
  .getOrganisationConnection(databaseName);

await connection.query('BEGIN');
try {
  // Opérations multiples
  await connection.query('INSERT INTO ...');
  await connection.query('UPDATE ...');
  await connection.query('COMMIT');
} catch (error) {
  await connection.query('ROLLBACK');
  throw error;
}
```

---

## 📊 PROGRESSION

### Services migrés
- ✅ Industries (100%) - Migration complète
- ✅ Leads (100%) - Migration complète, 11 suppressions de filtres organisation_id
- ✅ Opportunities (100%) - Migration complète, 5 suppressions de filtres organisation_id
- ✅ Activities (100%) - Migration complète, 20+ suppressions de filtres organisation_id
- ✅ Quotes (100%) - **Migration complète terminée le 20/12/2025** - Toutes les méthodes secondaires migrées
- ✅ Type Frais Annexe (100%) - Migration complète
- ✅ Pipeline (100%) - **Migration complète terminée le 20/12/2025** - Kanban, stats et toutes méthodes migrées
- ✅ Activity Attachments (100%) - Migration complète
- ⚠️ Reports (0%) - Reste en TypeORM (statistiques complexes, non critique, sera migré plus tard si nécessaire)

### Tests effectués
- ✅ Test isolation Industries
- ✅ Test isolation Leads
- ✅ Test isolation Opportunities  
- ✅ Test isolation Activities
- ✅ Test isolation Quotes
- ✅ Test isolation Pipeline

### État actuel
**Date:** 20 décembre 2025  
**Status:** 🟢 **MIGRATION TERMINÉE** - 8/9 services complètement migrés (89%)  
**Services critiques:** ✅ **100% opérationnels** (Leads, Opportunities, Activities, Industries, Quotes, Pipeline)  
**Prochaine étape:** Tests finaux avec organisation Danino et validation production

### 🎉 MÉTHODES MIGRÉES DANS CE COMMIT

#### Service Quotes (100%)
Toutes les méthodes restantes ont été migrées vers `connection.query()`:
- ✅ `updateLeadStatusToClient()` - Utilise SQL pur pour mettre à jour le statut des prospects
- ✅ `autoConvertToClient()` - Utilise SQL pur pour vérifier et mettre à jour les clients
- ✅ `updateOpportunityStage()` - Utilise SQL pur pour mettre à jour les opportunités
- ✅ `acceptQuote()` - Mise à jour complète avec SQL pur
- ✅ `rejectQuote()` - Migration vers SQL pur
- ✅ `cancelQuote()` - Migration vers SQL pur
- ✅ `duplicate()` - Migration complète vers SQL pur

**Total: 0 Repository restants, 100% SQL pur**

#### Service Pipeline (100%)
Migration complète du système Kanban:
- ✅ Suppression de tous les `@InjectRepository` (Opportunity, Lead, Personnel, Client)
- ✅ `getKanbanData()` - Migration complète du QueryBuilder vers SQL pur avec JOINs
- ✅ `getPipelineStats()` - Utilise databaseName
- ✅ `loadAssignedCommercialsForOpportunity()` - SQL pur
- ✅ `loadAssignedCommercialsForLead()` - SQL pur
- ✅ `getAllLeads()` - SQL pur avec relations
- ✅ `getAllOpportunities()` - SQL pur avec relations
- ✅ Mise à jour du controller pour utiliser `databaseName` au lieu de `organisationId`

**Total: 0 Repository restants, 100% SQL pur**

### 📋 RÉSUMÉ DES CHANGEMENTS

#### Fichiers modifiés
1. **quotes.service.ts**
   - Supprimé: Toutes utilisations de `leadRepository`, `opportunityRepository`, `clientRepository`, `quoteRepository`
   - Ajouté: SQL pur avec `connection.query()` partout
   - Impact: Toutes les méthodes secondaires maintenant multi-tenant

2. **pipeline.service.ts**
   - Supprimé: Tous les `@InjectRepository` (4 repositories)
   - Supprimé: Tous les `QueryBuilder` complexes
   - Ajouté: SQL pur avec JOINs manuels
   - Impact: Kanban 100% multi-tenant

3. **pipeline.controller.ts**
   - Changé: `organisationId` → `databaseName` dans toutes les méthodes
   - Impact: API Kanban maintenant correctement isolée par base

### 🔍 VÉRIFICATION FINALE

**Commande pour vérifier l'absence de Repository:**
```bash
# Doit retourner 0 résultats dans les services critiques
grep -r "@InjectRepository" src/crm/services/*.service.ts
```

**Résultat attendu:** Aucun `@InjectRepository` dans:
- ✅ industries.service.ts
- ✅ leads.service.ts
- ✅ opportunities.service.ts
- ✅ activities.service.ts
- ✅ quotes.service.ts
- ✅ pipeline.service.ts
- ✅ type-frais-annexe.service.ts
- ✅ activity-attachments.service.ts

**Seul service avec Repository (OK):**
- ⚠️ reports.service.ts (non critique, sera migré plus tard)

---

## 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Jour 1: Industries Service** (Simple, peu de méthodes)
   - Migration complète
   - Tests
   - Validation

2. **Jour 2: Leads Service** (Priorité CRM)
   - Finir la migration
   - Supprimer organisation_id
   - Tests

3. **Jour 3: Opportunities Service** (Priorité CRM)
   - Migration complète
   - Tests avec relations

4. **Jour 4: Quotes Service** (Critique)
   - Migration délicate
   - Tests exhaustifs

5. **Jour 5: Activities + Pipeline** (Complexes)
   - QueryBuilder → SQL
   - Tests avec JOINs multiples

6. **Jour 6: Tests finaux**
   - Tests d'intégration
   - Performance
   - Validation utilisateur

---

## 📞 SUPPORT

**En cas de problème:**
1. Vérifier les logs de connexion DB
2. Utiliser `console.log()` pour tracer le databaseName
3. Tester en SQL direct dans la base
4. Comparer avec un service fonctionnel (engins, ports)

**Commande utile pour déboguer:**
```typescript
// Dans n'importe quel service
console.log('🔍 [DEBUG] Database name:', databaseName);
const connection = await this.databaseConnectionService
  .getOrganisationConnection(databaseName);
console.log('🔍 [DEBUG] Connection:', connection.database);
```

---

**Document créé le:** 20/12/2025  
**Auteur:** GitHub Copilot (Claude Sonnet 4.5)  
**Version:** 1.0  
**Status:** 🔴 Migration en cours
