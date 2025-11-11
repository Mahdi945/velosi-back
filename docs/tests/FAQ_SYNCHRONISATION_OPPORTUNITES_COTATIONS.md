# ❓ FAQ - Synchronisation Opportunités ↔ Cotations

## 📅 Date de création
**Date:** 20 octobre 2025  
**Version:** v1.1

---

## 🎯 Questions Fréquentes

### 1️⃣ Lorsqu'une opportunité est gagnée, la cotation devient-elle automatiquement gagnée ?

**Réponse:** ❌ **NON - La synchronisation est unidirectionnelle : Cotation → Opportunité**

#### Fonctionnement actuel :

```
Cotation ACCEPTÉE → Opportunité CLOSED_WON ✅
Opportunité CLOSED_WON → Cotation ACCEPTÉE ❌
```

#### Raison :
Une opportunité peut être gagnée **sans cotation** ou avec **plusieurs cotations**. Le système ne peut pas décider automatiquement quelle cotation marquer comme acceptée.

#### Workflow recommandé :
1. Commercial accepte une cotation → Cotation passe à `ACCEPTED`
2. **Automatiquement**, l'opportunité liée passe à `CLOSED_WON`
3. Autres cotations liées à cette opportunité restent dans leur état actuel

#### Exemple concret :
```
Opportunité: "Transport Paris-Lyon" (ID: 123)
│
├── Cotation Q25/001: SENT
├── Cotation Q25/002: ACCEPTED ✅ → déclenche opportunité CLOSED_WON
└── Cotation Q25/003: REJECTED

Résultat: Opportunité fermée gagnée avec la cotation Q25/002
```

---

### 2️⃣ Lorsqu'une opportunité est perdue, les cotations deviennent-elles automatiquement rejetées ?

**Réponse:** ❌ **NON - Même logique unidirectionnelle**

#### Fonctionnement :

```
Cotation REJETÉE → Opportunité CLOSED_LOST ✅
Opportunité CLOSED_LOST → Cotations REJETÉES ❌
```

#### Raison :
L'utilisateur peut perdre une opportunité pour d'autres raisons (budget, timing, concurrent) sans que toutes les cotations soient formellement rejetées.

#### Workflow recommandé :
1. Si une cotation est rejetée → Opportunité passe à `CLOSED_LOST`
2. Si l'opportunité est marquée manuellement comme perdue, les cotations gardent leur état

---

### 3️⃣ Les cotations doivent-elles s'afficher dans le modal d'ajout de cotation si l'opportunité est fermée ?

**Réponse:** ❌ **NON - Les cotations ne doivent PAS être créées pour des opportunités fermées**

#### Règle de gestion :

| État Opportunité | Création Cotation | Raison |
|-----------------|-------------------|---------|
| `PROSPECTING` | ✅ Autorisée | Opportunité active |
| `QUALIFICATION` | ✅ Autorisée | Opportunité active |
| `NEEDS_ANALYSIS` | ✅ Autorisée | Opportunité active |
| `PROPOSAL` | ✅ Autorisée | Opportunité active |
| `NEGOTIATION` | ✅ Autorisée | Opportunité active |
| `CLOSED_WON` | ❌ **Interdite** | Opportunité gagnée → plus besoin de cotation |
| `CLOSED_LOST` | ❌ **Interdite** | Opportunité perdue → inutile |

#### Implémentation dans le code :

**Frontend - `opportunities.component.ts`:**
```typescript
/**
 * ✨ NOUVEAU: Naviguer vers la page de création de cotation
 */
navigateToCreateQuote(opportunityId?: number): void {
  // Si on a une opportunité sélectionnée et qu'elle est fermée (gagnée/perdue), empêcher la création
  const isClosed = this.selectedOpportunity &&
    (this.selectedOpportunity.stage === 'closed_won' || this.selectedOpportunity.stage === 'closed_lost');

  if (isClosed) {
    this.showError('Impossible de créer une cotation: opportunité déjà fermée (gagnée ou perdue).');
    return;
  }

  const queryParams: any = {};
  if (opportunityId) queryParams.opportunityId = opportunityId;

  this.router.navigate(['/crm/quotes'], { queryParams });
}
```

#### Message affiché :
```
❌ Impossible de créer une cotation: opportunité déjà fermée (gagnée ou perdue).
```

---

### 4️⃣ Lorsqu'une cotation est créée, passe-t-elle automatiquement à l'état "Proposition/Devis" ?

**Réponse:** ⚠️ **DÉPEND de votre processus métier**

#### Options d'implémentation :

##### Option A: État initial = DRAFT (Brouillon) 📝
**Recommandé pour validation avant envoi**

```typescript
// Backend - quotes.service.ts
async createQuote(createQuoteDto: CreateQuoteDto): Promise<Quote> {
  const quote = this.quoteRepository.create({
    ...createQuoteDto,
    status: QuoteStatus.DRAFT, // ← État initial
    createdAt: new Date()
  });
  
  return await this.quoteRepository.save(quote);
}
```

**Workflow:**
```
1. Création → DRAFT
2. Validation → SENT (via bouton "Envoyer")
3. Client consulte → VIEWED
4. Acceptation/Rejet → ACCEPTED/REJECTED
```

##### Option B: État initial = SENT (Envoyée) 📧
**Recommandé si cotation prête à l'envoi**

```typescript
async createQuote(createQuoteDto: CreateQuoteDto): Promise<Quote> {
  const quote = this.quoteRepository.create({
    ...createQuoteDto,
    status: QuoteStatus.SENT, // ← État initial = envoyée
    sentAt: new Date(),
    createdAt: new Date()
  });
  
  return await this.quoteRepository.save(quote);
}
```

**Workflow:**
```
1. Création → SENT (prête à consulter)
2. Client consulte → VIEWED
3. Acceptation/Rejet → ACCEPTED/REJECTED
```

#### État actuel dans le système :

**À vérifier dans:** `velosi-back/src/crm/services/quotes.service.ts`

Recherchez la méthode `createQuote()` pour voir quel statut initial est utilisé.

---

### 5️⃣ Quels sont tous les états qu'une cotation peut avoir ?

**Réponse:** 📊 **7 états possibles avec transitions**

#### Diagramme des états :

```
                    ┌─────────────┐
                    │   DRAFT     │ ← Création
                    │ (Brouillon) │
                    └──────┬──────┘
                           │ Envoi
                           ▼
                    ┌─────────────┐
                    │    SENT     │
                    │  (Envoyée)  │
                    └──────┬──────┘
                           │ Consultation client
                           ▼
                    ┌─────────────┐
           ┌────────│   VIEWED    │────────┐
           │        │    (Vue)    │        │
           │        └─────────────┘        │
           │                               │
    Acceptation                      Rejet/Expiration
           │                               │
           ▼                               ▼
    ┌─────────────┐              ┌─────────────┐
    │  ACCEPTED   │              │  REJECTED   │
    │ (Acceptée)  │              │ (Rejetée)   │
    └─────────────┘              └─────────────┘
                                        │
                                        │ Ou par date
                                        ▼
                                 ┌─────────────┐
                                 │   EXPIRED   │
                                 │  (Expirée)  │
                                 └─────────────┘
                                        
    À tout moment: CANCELLED (Annulée)
```

#### Détail des états :

| État | Label FR | Description | Couleur Badge | Icône |
|------|----------|-------------|---------------|-------|
| `DRAFT` | Brouillon | Cotation en cours de préparation | 🔵 Bleu (info) | ✏️ ti-pencil |
| `SENT` | Envoyée | Cotation envoyée au client | 🟢 Vert primaire | 📤 ti-send |
| `VIEWED` | Vue | Client a consulté la cotation | 🟡 Jaune (warning) | 👁️ ti-eye |
| `ACCEPTED` | Acceptée | Client a accepté → Opportunité gagnée | 🟢 Vert succès | ✅ ti-check |
| `REJECTED` | Rejetée | Client a refusé → Opportunité perdue | 🔴 Rouge danger | ❌ ti-x |
| `EXPIRED` | Expirée | Date de validité dépassée | ⚫ Gris | ⏰ ti-clock-off |
| `CANCELLED` | Annulée | Annulée manuellement | ⚫ Noir | 🚫 ti-ban |

---

### 6️⃣ Comment le timeline des cotations affiche-t-il tous ces états ?

**Réponse:** ✅ **Timeline enrichi avec historique complet**

#### Nouvelles fonctionnalités dans le timeline :

```html
<!-- Historique des états -->
<div class="mb-2" *ngIf="quote.sentAt || quote.viewedAt || quote.acceptedAt || quote.rejectedAt">
  <div class="small text-muted">
    <i class="ti ti-timeline me-1"></i><strong>Historique :</strong>
  </div>
  <div class="d-flex flex-wrap gap-2 mt-1">
    <span class="badge bg-light text-dark" *ngIf="quote.sentAt">
      <i class="ti ti-send" style="font-size: 10px;"></i> 
      Envoyée {{ quote.sentAt | date:'dd/MM à HH:mm' }}
    </span>
    <span class="badge bg-light text-dark" *ngIf="quote.viewedAt">
      <i class="ti ti-eye" style="font-size: 10px;"></i> 
      Vue {{ quote.viewedAt | date:'dd/MM à HH:mm' }}
    </span>
    <span class="badge bg-success-subtle text-success" *ngIf="quote.acceptedAt">
      <i class="ti ti-check" style="font-size: 10px;"></i> 
      Acceptée {{ quote.acceptedAt | date:'dd/MM à HH:mm' }}
    </span>
    <span class="badge bg-danger-subtle text-danger" *ngIf="quote.rejectedAt">
      <i class="ti ti-x" style="font-size: 10px;"></i> 
      Rejetée {{ quote.rejectedAt | date:'dd/MM à HH:mm' }}
    </span>
  </div>
</div>
```

#### Exemple d'affichage :

```
┌──────────────────────────────────────────────────┐
│ 📄 Cotation Q25/042                              │
├──────────────────────────────────────────────────┤
│ État: 🟢 Acceptée    🚚 Route                     │
│                                                   │
│ 📅 Historique:                                    │
│  📤 Envoyée 15/10 à 10:30                        │
│  👁️ Vue 16/10 à 14:15                            │
│  ✅ Acceptée 18/10 à 09:45                        │
│                                                   │
│ 📅 Créée le 15/10/2025 à 10:15                   │
│ 💰 8,500.00 €                                     │
│ 📆 Valide jusqu'au 30/10/2025                    │
└──────────────────────────────────────────────────┘
```

---

### 7️⃣ Que se passe-t-il si une cotation est acceptée mais l'opportunité est déjà gagnée avec une autre cotation ?

**Réponse:** ⚠️ **Cas à gérer - Validation recommandée**

#### Scénario problématique :

```
Opportunité: "Transport Paris-Lyon" (ID: 123) - CLOSED_WON
│
├── Cotation Q25/001: ACCEPTED ← Déjà acceptée
└── Cotation Q25/002: SENT ← Tentative d'acceptation
```

#### Solution recommandée :

**Backend - Validation dans `acceptQuote()`:**

```typescript
async acceptQuote(quoteId: string): Promise<Quote> {
  const quote = await this.findOne(quoteId);
  
  // ✅ Vérifier si l'opportunité est déjà fermée
  if (quote.opportunityId) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: quote.opportunityId }
    });
    
    if (opportunity && opportunity.stage === 'closed_won') {
      throw new BadRequestException(
        'Cette opportunité est déjà gagnée avec une autre cotation. Impossible d\'accepter cette cotation.'
      );
    }
  }
  
  // Accepter la cotation
  quote.status = QuoteStatus.ACCEPTED;
  quote.acceptedAt = new Date();
  
  // Synchroniser l'opportunité
  await this.updateOpportunityStage(
    quote.opportunityId,
    'closed_won',
    `Cotation ${quote.quoteNumber} acceptée`
  );
  
  return await this.quoteRepository.save(quote);
}
```

---

## 🔄 Résumé des Règles de Synchronisation

### Règle 1: Cotation → Opportunité (Automatique ✅)

| Action sur Cotation | Impact sur Opportunité | Automatique |
|---------------------|------------------------|-------------|
| ACCEPTÉE | → CLOSED_WON | ✅ Oui |
| REJETÉE | → CLOSED_LOST | ✅ Oui |
| DRAFT/SENT/VIEWED | Aucun impact | ➖ |

### Règle 2: Opportunité → Cotation (Manuel ❌)

| Action sur Opportunité | Impact sur Cotation | Automatique |
|------------------------|---------------------|-------------|
| CLOSED_WON | Aucun impact | ❌ Non |
| CLOSED_LOST | Aucun impact | ❌ Non |

### Règle 3: Création de Cotation (Validation ✅)

| État Opportunité | Création Autorisée | Message d'erreur |
|------------------|-------------------|------------------|
| Active (tous états sauf fermés) | ✅ Oui | - |
| CLOSED_WON | ❌ Non | "Opportunité déjà gagnée" |
| CLOSED_LOST | ❌ Non | "Opportunité déjà perdue" |

---

## 📝 Recommandations de Développement

### À implémenter côté Backend :

1. **Validation dans `createQuote()`:**
   - Vérifier que l'opportunité n'est pas fermée
   - Retourner erreur 400 si tentative de création

2. **Validation dans `acceptQuote()`:**
   - Vérifier qu'aucune autre cotation n'est déjà acceptée pour cette opportunité
   - Retourner erreur 409 (Conflict) si déjà gagnée

3. **Journalisation des changements d'état:**
   - Enregistrer tous les changements de statut avec timestamp
   - Créer table `quote_status_history` pour audit complet

### À améliorer côté Frontend :

1. **Désactivation des boutons:**
   - Désactiver "Créer cotation" si opportunité fermée
   - Afficher tooltip explicatif

2. **Affichage visuel:**
   - Badge "Fermée" sur opportunités gagnées/perdues
   - Icône de cadenas sur cotations acceptées

---

## 📌 Fichiers Impactés

### Backend :
- `velosi-back/src/crm/services/quotes.service.ts` ← À vérifier/modifier
- `velosi-back/src/crm/dto/create-quote.dto.ts` ← Validation opportunité

### Frontend :
- `velosi-front/src/app/components/crm/opportunities/opportunities/opportunities.component.ts` ✅ Déjà modifié
- `velosi-front/src/app/components/crm/opportunities/opportunities/opportunities.component.html` ✅ Déjà modifié
- `velosi-front/src/app/components/crm/prospects/prospects/prospects.component.ts` ✅ Déjà modifié
- `velosi-front/src/app/components/crm/prospects/prospects/prospects.component.html` ✅ Déjà modifié

---

## ✅ Checklist de Vérification

- [ ] État initial des cotations défini (DRAFT ou SENT)
- [ ] Validation empêchant création cotation sur opportunité fermée
- [ ] Validation empêchant double acceptation de cotations
- [ ] Timeline affichant tous les états de transition
- [ ] Messages d'erreur clairs pour l'utilisateur
- [ ] Tests unitaires pour les validations
- [ ] Documentation utilisateur mise à jour

---

**Auteur:** Assistant IA - Documentation Technique  
**Projet:** Velosi ERP - Module CRM  
**Contact:** Équipe développement
