# Mise à jour des Catégories de Transport et Ajout des Dimensions
**Date:** 26 octobre 2025  
**Modules affectés:** Cotations, Opportunités, Prospects, Pipeline, Rapports

---

## 📋 Résumé des Modifications

### 1. **Suppression du champ "État Dossier"**
- ❌ **Supprimé** du modal d'ajout/modification de cotation
- Le champ `fileStatus` a été retiré du formulaire frontend et backend

### 2. **Transformation du Type de Service en Checkbox**
- ✅ **Avant:** Menu déroulant avec 9 options (pickup_delivery, door_to_door, etc.)
- ✅ **Après:** Checkbox simple "Avec livraison" / "Sans livraison"
- 💾 **Stockage:** VARCHAR(50) dans la base de données
- 🔧 **Valeurs:** `"avec_livraison"` ou `"sans_livraison"` (par défaut: `"sans_livraison"`)

### 3. **Nouvelles Catégories de Transport**

#### Avant:
- Groupage
- Aérien
- Routier
- Complet

#### Après:
- **Groupage (LCL)** - Groupage maritime/aérien
- **Complet (FCL)** - Conteneur complet
- **Routier** - Transport routier
- **Aérien Normale** - Transport aérien standard
- **Aérien Expresse** - Transport aérien express

> 📌 **Note:** Les labels incluent maintenant les codes entre parenthèses (LCL, FCL) pour plus de clarté

### 4. **Ajout des Champs Dimensions**

Nouveaux champs ajoutés dans `crm_quote_items`:

| Champ | Type | Description |
|-------|------|-------------|
| `length_cm` | DECIMAL(8,2) | Longueur en centimètres |
| `width_cm` | DECIMAL(8,2) | Largeur en centimètres |
| `height_cm` | DECIMAL(8,2) | Hauteur en centimètres |
| `volumetric_weight` | DECIMAL(10,2) | Poids volumétrique en kg (calculé) |

**Précision du volume améliorée:**
- `volume_m3`: DECIMAL(10,2) → DECIMAL(10,3)

### 5. **Affichage Conditionnel des Dimensions**

Les champs de dimensions s'affichent **UNIQUEMENT** pour:
- ✅ Groupage (LCL)
- ✅ Aérien Normale
- ✅ Aérien Expresse

❌ **Masqués** pour:
- Routier
- Complet (FCL)

### 6. **Masquage du Poids Total pour Aérien**

⚠️ **Important:** Le champ "Poids Total (kg)" est **MASQUÉ** pour:
- ❌ Aérien Normale
- ❌ Aérien Expresse

**Raison:** Pour le transport aérien, c'est le **poids volumétrique** qui est utilisé dans les calculs, pas le poids brut.

✅ **Affiché** pour:
- Groupage (LCL)
- Complet (FCL)
- Routier

---

## 🔢 Formules de Calcul

### Volume (m³)
```
Volume = (Longueur × Largeur × Hauteur × Nombre de colis) / 1,000,000
```

### Poids Volumétrique (kg)

#### Aérien Normale
```
Poids Volumétrique = (L × l × h × colis) / 6000
```
⚠️ **Ce poids remplace le poids brut pour les calculs**

#### Aérien Expresse
```
Poids Volumétrique = (L × l × h × colis) / 5000
```
⚠️ **Ce poids remplace le poids brut pour les calculs**

#### Groupage (LCL)
```
Poids Volumétrique = (L × l × h × colis) / 1,000,000 × 1000
                   = Volume en m³ × 1000 kg
```
💡 **Note:** Pour le groupage, le poids volumétrique est informatif mais le poids brut reste utilisé

> 💡 **Note:** Le poids volumétrique s'affiche **uniquement pour les catégories aériennes**

---

## 📂 Fichiers Modifiés

### Backend (velosi-back)

#### Entités
- ✅ `src/crm/entities/quote-item.entity.ts`
  - Enum `QuoteItemCategory` mis à jour
  - `ServiceType` supprimé (remplacé par string)
  - Nouveaux champs: `lengthCm`, `widthCm`, `heightCm`, `volumetricWeight`
  
- ✅ `src/entities/crm/opportunity.entity.ts`
  - Enum `TransportType` mis à jour

#### DTOs
- ✅ `src/crm/dto/quote.dto.ts`
  - `CreateQuoteItemDto` et `UpdateQuoteItemDto` mis à jour
  - Nouveaux champs de dimensions ajoutés

#### Migration SQL
- ✅ `migrations/update_quote_items_transport_categories.sql`
  - Script de migration complet pour PostgreSQL
  - Conversion de `service_type` ENUM → VARCHAR
  - Ajout des colonnes dimensions
  - Migration des données existantes

### Frontend (velosi-front)

#### Models
- ✅ `src/app/models/quote.model.ts`
  - `QuoteItemCategory` enum mis à jour
  - `ServiceType` enum → `ServiceTypeValue` type
  - `CATEGORY_LABELS` et `SERVICE_TYPE_LABELS` mis à jour
  - Interface `QuoteItem` étendue avec nouveaux champs

#### Interfaces
- ✅ `src/app/interfaces/crm/opportunity.interface.ts`
  - `TransportType` enum mis à jour
  - `TRANSPORT_TYPE_LABELS` mis à jour avec labels complets

#### Composants

##### Cotations
- ✅ `components/crm/quotes/quotes/quotes.component.html`
  - Champ "État Dossier" supprimé
  - Type de Service transformé en checkbox
  - Section dimensions ajoutée (affichage conditionnel)
  - Labels de catégorie mis à jour

- ✅ `components/crm/quotes/quotes/quotes.component.ts`
  - Import `ServiceType` supprimé
  - Méthodes ajoutées:
    - `needsDimensions(index)` - Vérifie si dimensions nécessaires
    - `isAerien(index)` - Vérifie si catégorie aérienne
    - `onCategoryChange(index)` - Gère changement de catégorie
    - `calculateVolumeAndWeight(index)` - Calcule volume et poids volumétrique
    - `getVolumetricWeightFormula(index)` - Retourne formule affichée
    - `onServiceTypeChange(index, event)` - Gère checkbox livraison
  - Méthode `createItemFormGroup()` mise à jour
  - Tous les `fileStatus` supprimés

##### Opportunités, Prospects, Pipeline
- ✅ **Automatiquement mis à jour** via l'enum `TransportType` partagé
- Les labels sont affichés via `TRANSPORT_TYPE_LABELS`

---

## 🗄️ Migration de la Base de Données

### Étapes d'exécution

1. **Sauvegarder la base de données**
   ```bash
   pg_dump -U postgres -d velosi_erp > backup_avant_migration.sql
   ```

2. **Exécuter la migration**
   ```bash
   psql -U postgres -d velosi_erp -f migrations/update_quote_items_transport_categories.sql
   ```

3. **Vérifier les changements**
   ```sql
   -- Vérifier les nouvelles colonnes
   \d crm_quote_items
   
   -- Vérifier les données migrées
   SELECT category, COUNT(*) 
   FROM crm_quote_items 
   GROUP BY category;
   ```

### Points de migration importants

1. ✅ **Conversion automatique** des anciennes valeurs `'aerien'` → `'aerien_normale'`
2. ✅ **Service type** par défaut défini à `'sans_livraison'`
3. ✅ **Compatibilité ascendante** maintenue (anciennes données préservées)

---

## 🧪 Tests Recommandés

### Frontend

1. **Modal Cotations**
   - ✅ Vérifier que "État Dossier" n'apparaît plus
   - ✅ Checkbox "Avec/Sans livraison" fonctionne
   - ✅ Dimensions apparaissent pour Groupage/Aérien
   - ✅ Dimensions masquées pour Routier/Complet
   - ✅ **Poids Total masqué pour Aérien Normale et Aérien Expresse**
   - ✅ **Poids Total affiché pour Groupage, Complet et Routier**
   - ✅ Calcul volume automatique
   - ✅ Calcul poids volumétrique automatique (aérien uniquement)
   - ✅ Message informatif indiquant que le poids volumétrique remplace le poids brut

2. **Catégories dans toutes les pages**
   - ✅ Prospects: labels complets affichés
   - ✅ Opportunités: labels complets affichés
   - ✅ Pipeline: labels complets affichés
   - ✅ Rapports: nouvelles catégories présentes

### Backend

1. **API Cotations**
   ```bash
   # Créer une cotation avec dimensions
   POST /api/crm/quotes
   {
     "items": [{
       "category": "aerien_normale",
       "lengthCm": 120,
       "widthCm": 80,
       "heightCm": 100,
       "packagesCount": 5,
       "serviceType": "avec_livraison"
     }]
   }
   ```

2. **Vérification des calculs**
   - Volume doit être calculé: (120 × 80 × 100 × 5) / 1,000,000 = 4.8 m³
   - Poids volumétrique (aérien normal): (120 × 80 × 100 × 5) / 6000 = 800 kg

---

## 📊 Impact sur les Rapports

Les rapports doivent maintenant inclure les 5 catégories:
- Groupage (LCL)
- Complet (FCL)
- Routier
- Aérien Normale
- Aérien Expresse

> ⚠️ **Attention:** Les anciens rapports avec la catégorie "Aérien" ont été automatiquement convertis en "Aérien Normale"

---

## ✅ Checklist de Déploiement

- [ ] Sauvegarder la base de données
- [ ] Exécuter la migration SQL
- [ ] Déployer le backend (velosi-back)
- [ ] Déployer le frontend (velosi-front)
- [ ] Vérifier les cotations existantes
- [ ] Tester la création de nouvelles cotations
- [ ] Vérifier les rapports
- [ ] Informer les utilisateurs des changements

---

## 🔄 Rétrocompatibilité

✅ **Garantie de compatibilité:**
- Les anciennes cotations continuent de fonctionner
- Les valeurs `'aerien'` sont automatiquement converties
- Les champs `fileStatus` anciens sont ignorés
- Les anciens `service_type` enum sont convertis en string

---

## 📞 Support

Pour toute question concernant cette mise à jour:
- Documentation technique: Voir ce fichier
- Migration SQL: `migrations/update_quote_items_transport_categories.sql`
- Exemples de code: Voir composants `quotes.component.ts`

**Date de mise en production:** À définir  
**Version:** 2.1.0
