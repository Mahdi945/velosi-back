# 🔄 Migration Multi-Commerciaux CRM - Documentation

## 📋 Vue d'ensemble

Cette mise à jour transforme le système d'assignation des commerciaux dans le module CRM de **1 commercial unique** vers **N commerciaux multiples** (relation 1-N).

### 🎯 Objectif
Permettre d'assigner **plusieurs commerciaux** à :
- ✅ Prospects (Leads)
- ✅ Opportunités (Opportunities)
- ✅ Activités (Activities)
- ✅ Cotations (Quotes)

### 📊 Approche technique
Utilisation d'un **array PostgreSQL** (`INTEGER[]`) au lieu d'une table de jonction pour simplifier l'implémentation.

---

## 🔧 Modifications Backend

### 1️⃣ Migration Base de Données

**Fichier**: `velosi-back/src/docs/migrations/20250111000000-add-multiple-commercials-to-leads.sql`

#### Tables modifiées :
| Table | Nouveau champ | Type | Description |
|-------|--------------|------|-------------|
| `crm_leads` | `assigned_to_ids` | `INTEGER[]` | IDs des commerciaux assignés au prospect |
| `crm_opportunities` | `assigned_to_ids` | `INTEGER[]` | IDs des commerciaux assignés à l'opportunité |
| `crm_activities` | `assigned_to_ids` | `INTEGER[]` | IDs des commerciaux assignés à l'activité |
| `crm_quotes` | `commercial_ids` | `INTEGER[]` | IDs des commerciaux assignés à la cotation |

#### Points importants :
- ✅ Migration automatique des données existantes (`assigned_to` → `assigned_to_ids`)
- ✅ Index GIN ajoutés pour améliorer les performances de recherche
- 🔴 Champs anciens (`assigned_to`, `commercial_id`) conservés temporairement pour compatibilité

#### Exécution :
```bash
# Se connecter à PostgreSQL
psql -U votre_utilisateur -d velosi_db

# Exécuter la migration
\i src/docs/migrations/20250111000000-add-multiple-commercials-to-leads.sql
```

---

### 2️⃣ Entités TypeORM

#### Lead Entity (`velosi-back/src/entities/crm/lead.entity.ts`)
```typescript
// 🔴 ANCIEN SYSTÈME - conservé pour compatibilité
@Column({ name: 'assigned_to', nullable: true })
assignedToId: number;

@ManyToOne(() => Personnel, { nullable: true })
@JoinColumn({ name: 'assigned_to' })
assignedTo: Personnel;

// ✅ NOUVEAU SYSTÈME - Array de commerciaux
@Column({ name: 'assigned_to_ids', type: 'int', array: true, default: [] })
assignedToIds: number[];

// Propriété virtuelle pour charger les commerciaux assignés
assignedCommercials?: Personnel[];
```

#### Opportunity Entity (`velosi-back/src/entities/crm/opportunity.entity.ts`)
```typescript
// 🔴 ANCIEN SYSTÈME
@Column({ name: 'assigned_to', nullable: true })
assignedToId: number;

// ✅ NOUVEAU SYSTÈME
@Column({ name: 'assigned_to_ids', type: 'int', array: true, default: [] })
assignedToIds: number[];

assignedCommercials?: Personnel[];
```

#### Activity Entity (`velosi-back/src/crm/entities/activity.entity.ts`)
```typescript
// 🔴 ANCIEN SYSTÈME
@Column({ name: 'assigned_to', nullable: true })
assignedTo: number;

// ✅ NOUVEAU SYSTÈME
@Column({ name: 'assigned_to_ids', type: 'int', array: true, default: [] })
assignedToIds: number[];

assignedCommercials?: Personnel[];
```

#### Quote Entity (`velosi-back/src/crm/entities/quote.entity.ts`)
```typescript
// 🔴 ANCIEN SYSTÈME
@Column({ name: 'commercial_id', nullable: true })
commercialId: number;

// ✅ NOUVEAU SYSTÈME
@Column({ name: 'commercial_ids', type: 'int', array: true, default: [] })
commercialIds: number[];

assignedCommercials?: Personnel[];
```

---

### 3️⃣ DTOs (Data Transfer Objects)

#### Lead DTOs (`velosi-back/src/dto/crm/lead.dto.ts`)
```typescript
export class CreateLeadDto {
  // ... autres champs

  @IsOptional()
  @IsNumber()
  assignedToId?: number; // 🔴 Ancien - compatibilité

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => parseInt(v));
    return [parseInt(value)];
  })
  assignedToIds?: number[]; // ✅ Nouveau
}
```

#### Opportunity DTOs (`velosi-back/src/dto/crm/opportunity.dto.ts`)
- Même structure que Lead

---

### 4️⃣ Services

#### Lead Service (`velosi-back/src/services/crm/lead.service.ts`)

##### Méthode `create` :
```typescript
// Gestion du tableau de commerciaux
let assignedToIds = createLeadDto.assignedToIds || [];

// Auto-assignation pour les commerciaux
if (currentUser.role === 'commercial' && assignedToIds.length === 0) {
  assignedToIds = [userId];
}

// Vérification de l'existence de tous les commerciaux
const commerciaux = await this.personnelRepository.findBy({
  id: In(assignedToIds),
});

// Création avec les deux systèmes
const lead = this.leadRepository.create({
  ...createLeadDto,
  assignedToId,      // Ancien
  assignedToIds,     // Nouveau
  createdById: userId,
});

// Charger les commerciaux assignés
return await this.loadAssignedCommercials(savedLead);
```

##### Méthode utilitaire `loadAssignedCommercials` :
```typescript
private async loadAssignedCommercials(lead: Lead): Promise<Lead> {
  if (lead.assignedToIds && lead.assignedToIds.length > 0) {
    lead.assignedCommercials = await this.personnelRepository.findBy({
      id: In(lead.assignedToIds),
    });
  } else {
    lead.assignedCommercials = [];
  }
  return lead;
}
```

##### Méthodes `findAll`, `findAllArchived`, `findOne`, `update` :
- Toutes appellent `loadAssignedCommercials()` pour charger les commerciaux
- Support des deux systèmes (ancien + nouveau) pour compatibilité

---

## 🎨 Modifications Frontend (Prospect & Opportunité uniquement)

### 5️⃣ Interfaces TypeScript

#### Lead Interface (`velosi-front/src/app/interfaces/crm/lead-complete.interface.ts`)
```typescript
export interface Lead {
  id: number;
  // ... autres champs

  // 🔴 ANCIEN SYSTÈME
  assignedToId?: number;
  assignedTo?: Personnel;

  // ✅ NOUVEAU SYSTÈME
  assignedToIds?: number[];
  assignedCommercials?: Personnel[];
}
```

#### Personnel Interface
```typescript
export interface Personnel {
  id: number;
  nom: string;
  prenom: string;
  nom_utilisateur: string;
  role: string;
  email: string;
  // ... autres champs
}
```

---

### 6️⃣ Composant Prospects

#### TypeScript (`velosi-front/src/app/components/crm/prospects/prospects/prospects.component.ts`)

##### Variables pour multi-sélection :
```typescript
selectedCommercials: Personnel[] = []; // Commerciaux sélectionnés
showCommercialDropdown = false;
filteredCommerciaux: Personnel[] = [];
```

##### Méthode de sélection multiple :
```typescript
// Ajouter un commercial
selectCommercial(commercial: Personnel): void {
  if (!this.selectedCommercials.find(c => c.id === commercial.id)) {
    this.selectedCommercials.push(commercial);
    this.prospectForm.patchValue({
      assignedToIds: this.selectedCommercials.map(c => c.id)
    });
  }
}

// Retirer un commercial
removeCommercial(commercial: Personnel): void {
  this.selectedCommercials = this.selectedCommercials.filter(c => c.id !== commercial.id);
  this.prospectForm.patchValue({
    assignedToIds: this.selectedCommercials.map(c => c.id)
  });
}
```

##### FormGroup :
```typescript
this.prospectForm = this.fb.group({
  // ... autres champs
  assignedToId: [null],      // 🔴 Ancien
  assignedToIds: [[]],       // ✅ Nouveau
});
```

##### Soumission du formulaire :
```typescript
const formData: CreateLeadRequest | UpdateLeadRequest = {
  // ... autres champs
  assignedToIds: this.selectedCommercials.map(c => c.id),
};
```

---

#### Template (`velosi-front/src/app/components/crm/prospects/prospects/prospects.component.html`)

##### Affichage dans le tableau :
```html
<td>
  <!-- Affichage des commerciaux assignés -->
  <div *ngIf="prospect.assignedCommercials && prospect.assignedCommercials.length > 0">
    <span *ngFor="let commercial of prospect.assignedCommercials; let last = last"
          class="badge bg-success me-1">
      {{ commercial.prenom }} {{ commercial.nom }}
    </span>
  </div>
  <span *ngIf="!prospect.assignedCommercials || prospect.assignedCommercials.length === 0"
        class="text-muted">
    Non assigné
  </span>
</td>
```

##### Formulaire modal - Multi-sélection :
```html
<div class="col-md-6">
  <label class="form-label">Commerciaux assignés</label>
  
  <!-- Input de recherche -->
  <input 
    type="text" 
    class="form-control" 
    placeholder="Rechercher un commercial..."
    (input)="onCommercialSearch($event)"
    (focus)="showCommercialDropdown = true">
  
  <!-- Dropdown des suggestions -->
  <div class="dropdown-menu w-100" [class.show]="showCommercialDropdown">
    <button *ngFor="let commercial of filteredCommerciaux"
            type="button" 
            class="dropdown-item"
            (click)="selectCommercial(commercial)">
      {{ commercial.prenom }} {{ commercial.nom }}
    </button>
  </div>
  
  <!-- Liste des commerciaux sélectionnés (badges) -->
  <div class="mt-2">
    <span *ngFor="let commercial of selectedCommercials"
          class="badge bg-primary me-2 mb-2 d-inline-flex align-items-center">
      {{ commercial.prenom }} {{ commercial.nom }}
      <i class="ti ti-x ms-1" 
         (click)="removeCommercial(commercial)"
         style="cursor: pointer;"></i>
    </span>
  </div>
</div>
```

---

## 📊 Diagramme de flux

```
┌─────────────────────────────────────────────────────────────┐
│                    ANCIEN SYSTÈME                            │
│  Prospect → assigned_to (INT) → 1 Commercial                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    NOUVEAU SYSTÈME                           │
│  Prospect → assigned_to_ids (INT[]) → N Commerciaux         │
│                                                               │
│  [12, 45, 78] → Personnel.findBy({ id: In([12,45,78]) })   │
│              → [Commercial1, Commercial2, Commercial3]       │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Tests à effectuer

### Backend :
1. ✅ Exécuter la migration SQL
2. ✅ Créer un prospect avec plusieurs commerciaux
3. ✅ Modifier un prospect (ajouter/retirer des commerciaux)
4. ✅ Récupérer un prospect et vérifier que `assignedCommercials` est bien chargé
5. ✅ Filtrer les prospects par commercial (utiliser `ANY(assigned_to_ids)`)

### Frontend :
1. ⏳ Créer un prospect avec multi-sélection de commerciaux
2. ⏳ Modifier un prospect (ajouter/retirer des commerciaux)
3. ⏳ Afficher la liste des prospects avec badges de commerciaux
4. ⏳ Filtrer par commercial
5. ⏳ Auto-assignation pour les commerciaux

---

## 🚀 Prochaines étapes

### Immédiat (cette session) :
- [x] Migration BDD complète (Lead, Opportunity, Activity, Quote)
- [x] Entités backend mises à jour
- [x] DTOs backend mis à jour
- [x] Service Lead backend mis à jour
- [ ] Interface Lead frontend
- [ ] Composant Prospects frontend (TS + HTML)
- [ ] Interface Opportunity frontend
- [ ] Composant Opportunities frontend (TS + HTML)

### Future (prochaine session) :
- [ ] Service Opportunity backend
- [ ] Service Activity backend
- [ ] Service Quote backend
- [ ] Composant Activities frontend
- [ ] Composant Quotes frontend
- [ ] Tests complets end-to-end

---

## 📝 Notes importantes

### Compatibilité ascendante :
- Les champs `assigned_to` et `commercial_id` sont **conservés** temporairement
- Le système fonctionne avec les **deux approches** simultanément
- Migration transparente sans interruption de service

### Performance :
- Index GIN sur les arrays pour recherche rapide
- Chargement des commerciaux via `findBy({ id: In(ids) })` optimisé

### Suppression future :
Dans une prochaine migration (après validation complète) :
```sql
-- Supprimer les anciens champs (⚠️ NE PAS EXÉCUTER MAINTENANT)
ALTER TABLE crm_leads DROP COLUMN assigned_to;
ALTER TABLE crm_opportunities DROP COLUMN assigned_to;
ALTER TABLE crm_activities DROP COLUMN assigned_to;
ALTER TABLE crm_quotes DROP COLUMN commercial_id;
```

---

## 🆘 Dépannage

### Problème : Les commerciaux ne s'affichent pas
**Solution** : Vérifier que `loadAssignedCommercials()` est appelé dans le service

### Problème : Erreur lors de la création
**Solution** : Vérifier que `assignedToIds` est bien un array (pas `null` ou `undefined`)

### Problème : Migration échoue
**Solution** : Vérifier que la table existe et que PostgreSQL supporte les arrays

---

## 📞 Contact
Pour toute question sur cette migration, contactez l'équipe de développement.

**Date de création** : 11 janvier 2025
**Auteur** : GitHub Copilot
**Version** : 1.0
