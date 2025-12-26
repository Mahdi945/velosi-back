# Correction Dashboard Multi-Tenant

## Problème identifié

Le système utilise une **architecture multi-tenant avec bases de données séparées**, mais le code actuel essaie d'utiliser `organisation_id` dans toutes les tables.

### Tables AVEC `organisation_id` (schéma shipnology-structure.sql)
- ✅ `personnel` (a organisation_id NOT NULL DEFAULT 1)
- ✅ `client` (a organisation_id NOT NULL DEFAULT 1)

### Tables SANS `organisation_id`
- ❌ `crm_leads` 
- ❌ `crm_opportunities` 
- ❌ `crm_quotes` 
- ❌ `crm_activities`
- ❌ `engins` 
- ❌ `armateurs`
- ❌ `navires`
- ❌ `correspondants`
- ❌ Et toutes les autres tables...

## Solution : Multi-Tenant avec Bases Séparées

Chaque organisation a sa **propre base de données PostgreSQL** :
- `velosi` (base de données par défaut)
- `danino` (autre organisation)
- etc.

Le filtrage se fait via :
1. **Connexion à la bonne base via `databaseName`**
2. **PAS besoin d'`organisation_id`** dans les requêtes sauf pour personnel et client
3. **JWT** contient le `databaseName` pour router les requêtes

## Corrections à appliquer

### 1. Dashboard Service
Supprimer `organisation_id` de TOUTES les requêtes sur les tables CRM et ressources.

### 2. JWT Payload
Doit contenir :
```typescript
{
  sub: userId,
  username: string,
  email: string,
  role: string,
  userType: 'client' | 'personnel',
  organisationId: number,      // Pour filtrer personnel/client
  databaseName: string,         // ⚠️ CRUCIAL: pour se connecter à la bonne DB
  organisationName: string      // Pour l'affichage
}
```

### 3. MultiTenantInterceptor
Doit extraire `databaseName` du JWT et switcher la connexion.

## Tables à corriger dans dashboard.service.ts

Remplacer partout :
```sql
-- ❌ AVANT
WHERE organisation_id = $1 AND ...
LEFT JOIN personnel p ON ... AND p.organisation_id = l.organisation_id

-- ✅ APRÈS (pour crm_leads, crm_opportunities, etc.)
-- Pas de WHERE organisation_id
LEFT JOIN personnel p ON p.id = l.created_by  -- Personnel a organisation_id
```

La connexion à la bonne base suffit pour isoler les données !
