# Migration: Ajout du champ Unité de Mesure (unit)

## 📋 Description
Cette migration ajoute le champ `unit` (unité de mesure) à la table `crm_quote_items` pour permettre de spécifier l'unité de facturation de chaque ligne de cotation.

## 🎯 Objectif
Permettre de distinguer clairement les différentes unités de mesure utilisées dans les cotations :
- **Poids** : KG, TONNE, LBS, QUINTAL
- **Volume** : M³, L, CBM, CBF
- **Quantité** : PIECE, COLIS, PALETTE, CARTON, SAC
- **Autre** : TRAJET, FORFAIT, JOUR, HEURE, VOYAGE

## 📦 Fichiers de migration

### 1. `add_unit_column_to_quote_items.sql` (OBLIGATOIRE)
**Ordre d'exécution : 1**

Script principal qui ajoute la colonne `unit` à la table `crm_quote_items`.

```sql
-- Exécution
psql -U postgres -d velosi_erp -f add_unit_column_to_quote_items.sql
```

**Actions effectuées :**
- Ajoute la colonne `unit VARCHAR(50) NULL`
- Ajoute un commentaire explicatif
- Crée un index pour optimiser les recherches

### 2. `seed_default_units_quote_items.sql` (OPTIONNEL)
**Ordre d'exécution : 2**

Script de seed qui assigne des unités par défaut aux données existantes.

```sql
-- Exécution (OPTIONNEL)
psql -U postgres -d velosi_erp -f seed_default_units_quote_items.sql
```

**Actions effectuées :**
- Assigne 'TRAJET' aux lignes de fret sans unité
- Assigne 'FORFAIT' aux frais annexes sans unité
- Assigne des unités selon la catégorie (M3, 40HC, KG, etc.)

## 🚀 Instructions d'exécution

### Étape 1 : Backup de la base de données (RECOMMANDÉ)
```bash
pg_dump -U postgres velosi_erp > backup_before_unit_migration_$(date +%Y%m%d_%H%M%S).sql
```

### Étape 2 : Exécuter la migration principale
```bash
cd c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\docs\migrations

# Windows PowerShell
$env:PGPASSWORD="votre_mot_de_passe"
psql -U postgres -d velosi_erp -f add_unit_column_to_quote_items.sql
```

### Étape 3 : (Optionnel) Exécuter le seed
```bash
psql -U postgres -d velosi_erp -f seed_default_units_quote_items.sql
```

### Étape 4 : Vérification
```sql
-- Vérifier que la colonne a été créée
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'crm_quote_items'
AND column_name = 'unit';

-- Vérifier les unités assignées
SELECT 
    item_type,
    category,
    unit,
    COUNT(*) as count
FROM crm_quote_items
GROUP BY item_type, category, unit
ORDER BY item_type, category, unit;

-- Vérifier s'il reste des lignes sans unité
SELECT id, description, item_type, category, unit
FROM crm_quote_items
WHERE unit IS NULL
LIMIT 10;
```

## 🔄 Rollback (Annulation)
En cas de problème, vous pouvez annuler la migration :

```sql
-- Supprimer l'index
DROP INDEX IF EXISTS idx_quote_items_unit;

-- Supprimer la colonne
ALTER TABLE crm_quote_items DROP COLUMN IF EXISTS unit;
```

## 📊 Impact sur l'application

### Backend (NestJS)
- ✅ Entity : `QuoteItem` avec le champ `unit?: string`
- ✅ DTO : `CreateQuoteItemDto` et `UpdateQuoteItemDto` avec validation `@IsString()`

### Frontend (Angular)
- ✅ Model : `QuoteItem` avec le champ `unit?: string`
- ✅ Constantes : `UNIT_TYPES` avec 16 unités prédéfinies (sans conteneurs)
- ✅ Composant : Select avec catégories d'unités
- ✅ Validation : Champ obligatoire dans le formulaire

## 🎨 Interface utilisateur
Après cette migration, l'interface affichera :
- Un **select** pour choisir l'unité de mesure (organisé par catégories)
- L'**unité affichée** à côté du champ quantité (ex: "2 × KG")
- L'**unité dans les exports PDF** et impressions

## ⚠️ Notes importantes

1. **Compatibilité** : La colonne est `NULL` par défaut pour ne pas casser les cotations existantes
2. **Validation frontend** : Le champ est obligatoire dans le formulaire Angular
3. **Migration des données** : Le script de seed est optionnel mais recommandé
4. **Performance** : Un index a été créé pour optimiser les recherches par unité

## 📞 Support
En cas de problème lors de la migration, contactez l'équipe technique avec :
- Les logs d'erreur PostgreSQL
- Le résultat de la requête de vérification
- La version de PostgreSQL utilisée

---
**Date de création** : 24 novembre 2025  
**Version** : 1.0.0  
**Auteur** : Équipe Velosi ERP
