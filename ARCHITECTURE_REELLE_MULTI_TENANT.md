# 🏗️ ARCHITECTURE RÉELLE MULTI-TENANT

## 🔍 DÉCOUVERTE CRITIQUE

Votre système utilise **DEUX APPROCHES DIFFÉRENTES** en parallèle :

---

## ✅ APPROCHE 1 : Bases de données séparées (VRAIE isolation)

### Fonctionnement
```typescript
// Chaque organisation a sa propre base PostgreSQL
const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
// databaseName = 'velosi', 'danino', 'transport_rapide', etc.

const result = await connection.query('SELECT * FROM personnel WHERE id = $1', [userId]);
```

### Avantages
✅ **Isolation complète** - Impossible d'accéder aux données d'une autre organisation  
✅ **Pas besoin de `organisation_id`** dans les tables  
✅ **Sécurité maximale** - Séparation physique des données

### Services qui utilisent cette approche
- ✅ `DashboardService` → `getOrganisationConnection()`
- ✅ `NaviresService` → `getOrganisationConnection()`
- ✅ `ArmateursService` → `getOrganisationConnection()`
- ✅ `FournisseursService` → `getOrganisationConnection()`
- ✅ `EnginsService` (gestion-ressources) → `getOrganisationConnection()`
- ✅ `LeadsService` → `getOrganisationConnection()`
- ✅ `OpportunitiesService` → `getOrganisationConnection()`
- ✅ `ActivitiesService` → `getOrganisationConnection()`

**Résultat** : Ces services **FONCTIONNENT CORRECTEMENT** avec le multi-tenant

---

## ❌ APPROCHE 2 : TypeORM Repository injecté (UNE SEULE base)

### Fonctionnement
```typescript
// Configuration dans database.config.ts
database: configService.get('DB_DATABASE') || 'velosi',
// ↑ Connexion FIXE à une seule base

@Injectable()
export class PipelineService {
  constructor(
    @InjectRepository(Opportunity)  // ❌ Se connecte TOUJOURS à 'velosi'
    private opportunityRepository: Repository<Opportunity>,
    
    @InjectRepository(Personnel)    // ❌ Se connecte TOUJOURS à 'velosi'
    private personnelRepository: Repository<Personnel>,
  ) {}
  
  async loadCommercials(ids: number[]) {
    // ⚠️ PROBLÈME : Cette requête va dans la base 'velosi' UNIQUEMENT
    // Elle retourne du personnel de TOUTES les organisations
    const commercials = await this.personnelRepository
      .createQueryBuilder('personnel')
      .where('personnel.id IN (:...ids)', { ids })
      // ❌ MANQUE : .andWhere('personnel.organisation_id = :orgId', { orgId })
      .getMany();
  }
}
```

### Problèmes
❌ **Mélange des données** - Personnel de Velosi + Danino + autres organisations  
❌ **Requiert `organisation_id`** dans CHAQUE requête  
❌ **Risque de fuite de données** si oubli du filtre

### Services qui utilisent cette approche
- ❌ `PipelineService` → `@InjectRepository()`
- ❌ Certaines méthodes dans `UsersService`
- ❌ Certaines méthodes dans `AuthService`

**Résultat** : Ces services **MÉLANGENT LES DONNÉES** des organisations

---

## 🚨 PROBLÈME VU DANS LES LOGS

```sql
-- Requête problématique dans PipelineService
SELECT "Personnel"."id", "Personnel"."nom", "Personnel"."prenom" 
FROM "personnel" "Personnel" 
WHERE (("Personnel"."id" IN ($1))) 
-- PARAMETERS: [3]

-- ❌ MANQUE : AND "Personnel"."organisation_id" = 17
```

**Cette requête retourne :**
- Personnel ID=3 de **n'importe quelle organisation** (Velosi, Danino, etc.)
- Pas de filtrage par `organisation_id`

**Dans vos logs :**
```
JWT contient: organisationId=17, databaseName='danino'
Requête cherche: personnel ID=3
Résultat: Retourne personnel ID=3 de Velosi (organisation_id=1) au lieu de Danino (organisation_id=17)
```

---

## 💡 SOLUTIONS

### OPTION A : Migrer PipelineService vers getOrganisationConnection() ✅ RECOMMANDÉ

```typescript
@Injectable()
export class PipelineService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}
  
  async getKanbanData(databaseName: string, filters: PipelineFilters) {
    // ✅ Se connecter à la bonne base
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // ✅ Requête SQL directe - isolation automatique
    const opportunities = await connection.query(`
      SELECT * FROM crm_opportunities 
      WHERE stage = $1
      ORDER BY created_at DESC
    `, ['prospecting']);
    
    return opportunities;
  }
}
```

**Avantages** :
- ✅ Isolation complète des données
- ✅ Pas besoin de filtrer par `organisation_id`
- ✅ Cohérent avec le reste du code

---

### OPTION B : Ajouter filtre organisation_id partout (NON recommandé)

```typescript
async loadCommercials(ids: number[], organisationId: number) {
  // ⚠️ FAUT PAS OUBLIER le filtre !
  const commercials = await this.personnelRepository
    .createQueryBuilder('personnel')
    .where('personnel.id IN (:...ids)', { ids })
    .andWhere('personnel.organisation_id = :orgId', { orgId: organisationId })
    .getMany();
}
```

**Problèmes** :
- ❌ Facile d'oublier le filtre → fuite de données
- ❌ Toutes les organisations dans une seule base → performances
- ❌ Pas d'isolation physique

---

## 📋 PLAN DE CORRECTION

### 1. Services prioritaires à corriger
- [ ] **PipelineService** → Migrer vers `getOrganisationConnection()`
- [ ] **QuotesService** (si utilise @InjectRepository)
- [ ] Vérifier tous les `createQueryBuilder()` sans filtre `organisation_id`

### 2. Vérifications
```bash
# Trouver tous les Repository injectés
grep -r "@InjectRepository" src/

# Trouver les requêtes sans organisation_id
grep -r "createQueryBuilder\|.where(" src/ | grep -v "organisation_id"
```

### 3. Tests à faire
- [ ] Dashboard : Vérifier que personnel/clients sont de la bonne org
- [ ] CRM Opportunities : Vérifier qu'on voit QUE ses propres données
- [ ] Industries : Données partagées OU par organisation ?

---

## 🎯 RECOMMANDATION FINALE

**UTILISEZ `getOrganisationConnection()`** partout :

### Pourquoi ?
1. **Sécurité maximale** - Isolation physique des bases
2. **Performance** - Bases plus petites = requêtes plus rapides
3. **Simplicité** - Pas de filtre `organisation_id` à gérer
4. **Cohérence** - 90% du code utilise déjà cette méthode

### Comment migrer ?
```typescript
// ❌ AVANT
constructor(@InjectRepository(Entity) private repo: Repository<Entity>) {}

// ✅ APRÈS
constructor(private databaseConnectionService: DatabaseConnectionService) {}

// Dans chaque méthode
const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
const results = await connection.query('SELECT ...', [params]);
```

---

## 📊 ÉTAT ACTUEL

### Services corrects (getOrganisationConnection) ✅
- Dashboard
- Navires, Armateurs, Fournisseurs
- Engins, Ports, Aéroports
- CRM: Leads, Opportunities, Activities, Quotes

### Services à corriger (@InjectRepository) ❌
- **PipelineService** ← URGENT
- UsersService (certaines méthodes)
- AuthService (vérifier validateJwtPayload)

---

**Date**: 20 décembre 2025
**Status**: ⚠️ Architecture hybride - Migration en cours
