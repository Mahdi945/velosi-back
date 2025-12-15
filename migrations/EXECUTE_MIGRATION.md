# Migration: Ajouter updated_by aux cotations

## Étapes à suivre

### 1. Se connecter à PostgreSQL

```bash
# Depuis le terminal du backend
psql -U postgres -d velosi_db
```

### 2. Exécuter la migration

```bash
# Depuis le dossier migrations
psql -U postgres -d velosi_db -f add_updated_by_to_quotes.sql
```

### 3. Vérifier que la colonne a été ajoutée

```sql
-- Dans psql
\d crm_quotes

-- Ou
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_quotes'
AND column_name = 'updated_by';
```

### 4. Vérifier les données

```sql
-- Voir quelques cotations avec la nouvelle colonne
SELECT id, quote_number, created_by, updated_by, created_at, updated_at
FROM crm_quotes
LIMIT 5;
```

## En cas d'erreur "colonne existe déjà"

Si la colonne existe déjà, vérifiez avec :

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'crm_quotes' 
AND column_name = 'updated_by';
```

## Rollback (si nécessaire)

```sql
-- Supprimer la colonne et ses contraintes
ALTER TABLE crm_quotes DROP COLUMN IF EXISTS updated_by CASCADE;
```
