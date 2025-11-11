# 🗑️ Stratégie de Soft Delete pour le CRM

## 📋 Vue d'ensemble

Cette implémentation utilise une stratégie de **soft delete** pour les entités critiques du CRM afin de :
- ✅ **Préserver l'historique commercial** complet
- ✅ **Assurer la conformité légale** (conservation des cotations)
- ✅ **Permettre l'analyse de performance** (taux de conversion, raisons de perte)
- ✅ **Faciliter la récupération** de données supprimées par erreur
- ✅ **Maintenir la cohérence** des données avec cascade intelligent

---

## 🏗️ Architecture

### Entités avec Soft Delete

| Entité | Stratégie | Raison |
|--------|-----------|--------|
| **Lead** | Soft Delete ⚠️ | Historique du pipeline commercial |
| **Opportunity** | Soft Delete ⚠️ | Analyse des performances commerciales |
| **Quote** | Soft Delete ⚠️ | Documents légaux, traçabilité financière |
| **QuoteItem** | Cascade Delete ✅ | N'a pas de sens sans la cotation parent |
| **Activity** | Cascade Delete ✅ | Suit le cycle de vie de l'entité parent |
| **Client** | Protégé ❌ | Empêche la suppression si relations actives |

### Colonnes ajoutées

Toutes les entités avec soft delete héritent de `BaseEntityWithSoftDelete` :

```typescript
abstract class BaseEntityWithSoftDelete {
  deletedAt: Date;              // NULL = actif, Date = supprimé
  isArchived: boolean;           // Archivage manuel vs suppression
  archivedReason: string;        // Raison de l'archivage
  archivedBy: number;            // ID de l'utilisateur qui a archivé
}
```

---

## 🚀 Migration

### Option 1 : Migration Sequelize (recommandée)

```bash
cd velosi-back
npm run migration:run
```

### Option 2 : Script SQL manuel

Si la migration Sequelize échoue, exécutez le script manuel :

```bash
# Dans PostgreSQL
psql -U postgres -d velosi_db -f migrations/add_soft_delete_manual.sql
```

Le script ajoute :
- Les 4 colonnes soft delete à `crm_leads`, `crm_opportunities`, `crm_quotes`
- Les index partiels pour optimiser les requêtes
- Les contraintes FK sur `archived_by` → `personnel(id)`

---

## 📡 API Endpoints

### Leads (`/crm/leads`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/crm/leads` | Récupérer tous les leads actifs |
| GET | `/crm/leads/:id` | Récupérer un lead par ID |
| GET | `/crm/leads/statistics` | Statistiques des leads |
| GET | `/crm/leads/archived/all` | Récupérer les leads archivés |
| POST | `/crm/leads` | Créer un nouveau lead |
| PUT | `/crm/leads/:id` | Mettre à jour un lead |
| PATCH | `/crm/leads/:id/archive` | **Archiver un lead** (soft delete) |
| PATCH | `/crm/leads/:id/restore` | **Restaurer un lead archivé** |
| DELETE | `/crm/leads/:id` | ❌ **Désactivé** - Renvoie une erreur |

#### Exemple : Archiver un lead

```bash
PATCH /crm/leads/123/archive
Content-Type: application/json

{
  "reason": "Lead inactif depuis plus de 6 mois"
}
```

#### Exemple : Restaurer un lead

```bash
PATCH /crm/leads/123/restore
```

---

### Opportunities (`/crm/opportunities`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/crm/opportunities` | Récupérer toutes les opportunités actives |
| GET | `/crm/opportunities/:id` | Récupérer une opportunité par ID |
| GET | `/crm/opportunities/statistics` | Statistiques des opportunités |
| GET | `/crm/opportunities/archived/all` | Récupérer les opportunités archivées |
| POST | `/crm/opportunities` | Créer une nouvelle opportunité |
| PUT | `/crm/opportunities/:id` | Mettre à jour une opportunité |
| PATCH | `/crm/opportunities/:id/archive` | **Archiver une opportunité** |
| PATCH | `/crm/opportunities/:id/restore` | **Restaurer une opportunité** |
| DELETE | `/crm/opportunities/:id` | ❌ **Désactivé** |

---

### Quotes (`/crm/quotes`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/crm/quotes` | Récupérer toutes les cotations actives |
| GET | `/crm/quotes/:id` | Récupérer une cotation par ID |
| GET | `/crm/quotes/statistics` | Statistiques des cotations |
| GET | `/crm/quotes/archived/all` | Récupérer les cotations archivées |
| POST | `/crm/quotes` | Créer une nouvelle cotation |
| PUT | `/crm/quotes/:id` | Mettre à jour une cotation |
| PATCH | `/crm/quotes/:id/archive` | **Archiver une cotation** |
| PATCH | `/crm/quotes/:id/restore` | **Restaurer une cotation** |
| DELETE | `/crm/quotes/:id` | ⚠️ **À modifier** pour utiliser soft delete |

---

## 💻 Utilisation dans les Services

### Archivage

```typescript
// Lead
const archivedLead = await leadsService.archiveLead(
  leadId, 
  'Lead converti en client', 
  userId
);

// Opportunity
const archivedOpp = await opportunitiesService.archiveOpportunity(
  oppId,
  'Opportunité perdue - concurrent moins cher',
  userId
);

// Quote
const archivedQuote = await quotesService.archiveQuote(
  quoteId,
  'Cotation expirée',
  userId
);
```

### Restauration

```typescript
const restoredLead = await leadsService.restoreLead(leadId);
const restoredOpp = await opportunitiesService.restoreOpportunity(oppId);
const restoredQuote = await quotesService.restoreQuote(quoteId);
```

### Récupération avec entités archivées

```typescript
// Par défaut : seulement les actifs
const activeLeads = await leadRepository.find({
  where: { deletedAt: IsNull() }
});

// Inclure les archivés
const allLeads = await leadRepository.find({
  withDeleted: true
});

// Seulement les archivés
const archivedLeads = await leadRepository
  .createQueryBuilder('lead')
  .withDeleted()
  .where('lead.deleted_at IS NOT NULL')
  .getMany();
```

---

## 🔒 Règles de Cascade

### Lead → Activity

```typescript
@ManyToOne(() => Lead, { onDelete: 'CASCADE' })
```

**Comportement** : Si un lead est archivé (soft delete), les activités associées sont automatiquement supprimées physiquement (hard delete).

### Opportunity → Activity

```typescript
@ManyToOne(() => Opportunity, { onDelete: 'CASCADE' })
```

**Comportement** : Si une opportunité est archivée, les activités associées sont supprimées.

### Quote → QuoteItem

```typescript
@ManyToOne(() => Quote, { onDelete: 'CASCADE' })
```

**Comportement** : Si une cotation est archivée, les items sont supprimés (pas de soft delete sur les items).

### Quote → Lead/Opportunity/Client

```typescript
@ManyToOne(() => Lead, { onDelete: 'SET NULL' })
@ManyToOne(() => Opportunity, { onDelete: 'SET NULL' })
@ManyToOne(() => Client, { onDelete: 'SET NULL' })
```

**Comportement** : Si un lead/opportunité/client est archivé, les cotations conservent l'ID mais la relation est mise à NULL.

---

## 📊 Avantages de cette approche

### ✅ Traçabilité complète
- Aucune perte de données commerciales
- Audit trail complet des actions

### ✅ Conformité légale
- Les cotations restent accessibles pour les audits financiers
- Conservation des documents légaux

### ✅ Analyse de performance
- Historique complet des opportunités perdues
- Calcul précis des taux de conversion
- Analyse des raisons de perte

### ✅ Récupération possible
- Les données "supprimées" peuvent être restaurées
- Protection contre les suppressions accidentelles

### ✅ Nettoyage intelligent
- Les items/activités suivent automatiquement leur parent
- Pas de données orphelines

---

## 🔄 Workflow Frontend

### Interface utilisateur recommandée

1. **Liste principale** : N'affiche que les entités actives (`deletedAt IS NULL`)
2. **Bouton "Archiver"** : Au lieu de "Supprimer"
3. **Onglet "Archivés"** : Vue séparée pour les entités archivées
4. **Bouton "Restaurer"** : Dans la vue des archivés

### Exemple Angular

```typescript
// Component
archiveLead(lead: Lead) {
  const dialogRef = this.dialog.open(ArchiveConfirmDialogComponent, {
    data: { 
      entity: 'lead', 
      name: lead.fullName 
    }
  });

  dialogRef.afterClosed().subscribe(reason => {
    if (reason) {
      this.leadsService.archiveLead(lead.id, reason).subscribe(() => {
        this.loadLeads(); // Rafraîchir la liste
      });
    }
  });
}

restoreLead(lead: Lead) {
  this.leadsService.restoreLead(lead.id).subscribe(() => {
    this.loadArchivedLeads(); // Rafraîchir la liste des archivés
  });
}
```

---

## 🛠️ Configuration TypeORM

Les entités doivent être configurées dans `database.config.ts` :

```typescript
entities: [
  Lead,
  Opportunity,
  Quote,
  QuoteItem,
  Activity,
  // ... autres entités
]
```

⚠️ **Important** : Ne pas oublier d'ajouter les nouvelles entités à cette liste, sinon TypeORM ne pourra pas les trouver.

---

## 📝 Checklist d'implémentation

- [x] Créer `BaseEntityWithSoftDelete`
- [x] Migration pour ajouter les colonnes soft delete
- [x] Modifier `Lead`, `Opportunity`, `Quote` pour étendre `BaseEntityWithSoftDelete`
- [x] Créer `LeadsService` avec méthodes soft delete
- [x] Créer `OpportunitiesService` avec méthodes soft delete
- [x] Ajouter méthodes soft delete à `QuotesService`
- [x] Créer `LeadsController` avec endpoints d'archivage
- [x] Créer `OpportunitiesController` avec endpoints d'archivage
- [x] Ajouter endpoints d'archivage à `QuotesController`
- [ ] Exécuter la migration SQL
- [ ] Redémarrer le backend
- [ ] Tester les endpoints d'archivage/restauration
- [ ] Implémenter l'UI frontend pour archivage/restauration
- [ ] Créer la vue "Archivés" dans le frontend
- [ ] Tester le workflow complet

---

## 🚦 Prochaines étapes

1. **Exécuter la migration** : `npm run migration:run` ou script SQL manuel
2. **Redémarrer le backend** : Pour charger les nouvelles entités
3. **Tester les endpoints** : Utiliser Postman/Insomnia
4. **Implémenter le frontend** : Ajouter les boutons Archiver/Restaurer
5. **Former les utilisateurs** : Expliquer la différence entre archivage et suppression

---

## ❓ FAQ

### Pourquoi soft delete au lieu de hard delete ?

- **Conformité légale** : Les cotations sont des documents légaux
- **Audit trail** : Traçabilité complète des actions commerciales
- **Analyse** : Impossible de calculer les taux de conversion sans l'historique
- **Récupération** : Protection contre les erreurs

### Que se passe-t-il avec les activités liées ?

Les activités suivent le cycle de vie de leur parent grâce à `onDelete: 'CASCADE'`. Si vous archivez un lead, ses activités sont supprimées physiquement (car elles n'ont pas de valeur sans le lead).

### Peut-on vraiment supprimer définitivement ?

Oui, mais uniquement via des scripts SQL directs pour le nettoyage périodique (ex: purge annuelle des données de plus de 7 ans). Pas via l'API.

### Comment gérer la performance avec beaucoup d'archivés ?

Les index partiels `WHERE deleted_at IS NULL` assurent que les requêtes principales (entités actives) restent rapides même avec des millions d'archivés.

---

## 📚 Références

- [TypeORM Soft Delete](https://typeorm.io/delete-query-builder#soft-delete)
- [NestJS Best Practices](https://docs.nestjs.com/techniques/database)
- [PostgreSQL Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)

---

**Date de création** : 28 octobre 2025  
**Auteur** : Architecture CRM Velosi  
**Version** : 1.0
