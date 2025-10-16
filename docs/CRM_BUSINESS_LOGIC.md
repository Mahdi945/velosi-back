# 📊 Logique Métier CRM - Velosi Transport

## 🎯 Vue d'ensemble du cycle de vente

Le CRM suit un **flux naturel de conversion** des prospects en clients :

```
PROSPECT (Lead) → OPPORTUNITÉ → DEVIS (Quote) → CLIENT
        ↓              ↓              ↓
    ACTIVITÉS     ACTIVITÉS      ACTIVITÉS
```

---

## 1️⃣ **PROSPECT (Lead)**

### Définition
Un **prospect** est un **contact potentiel** qui n'est **pas encore client** mais qui a manifesté un intérêt pour vos services de transport.

### Sources de prospects
- Site web (formulaire de contact)
- Appel téléphonique entrant
- Email
- Réseaux sociaux
- Salons professionnels
- Recommandation (referral)
- Prospection à froid (cold call)
- Partenaires

### Statuts d'un prospect
1. **new** - Nouveau prospect, pas encore contacté
2. **contacted** - Premier contact établi
3. **qualified** - Prospect qualifié (a un besoin réel + budget)
4. **unqualified** - Pas de besoin ou budget insuffisant
5. **nurturing** - En maturation (suivi régulier)
6. **converted** - Converti en opportunité ✅
7. **lost** - Perdu (pas intéressé)

### Exemple concret
```
Nom: Jean Dupont
Entreprise: TechCorp SARL
Email: j.dupont@techcorp.tn
Téléphone: +216 71 234 567
Besoin: Transport régulier de matériel informatique Tunis → Sousse
Volume estimé: 5000 TND/mois
Source: Site web
Statut: new → contacted → qualified
```

---

## 2️⃣ **OPPORTUNITÉ (Opportunity)**

### Définition
Une **opportunité** est un **prospect qualifié** qui a un besoin concret, un budget et une intention d'achat. C'est une **vente potentielle**.

### Quand créer une opportunité ?
✅ Le prospect a confirmé un besoin précis
✅ Il a un budget défini
✅ Il a un calendrier de décision
✅ Il est décisionnaire ou a accès au décisionnaire

### Pipeline de vente (Étapes)
1. **prospecting** (10% chance) - Identification du besoin
2. **qualification** (25% chance) - Validation budget/besoin/timing
3. **needs_analysis** (50% chance) - Analyse détaillée des besoins transport
4. **proposal** (75% chance) - Envoi du devis
5. **negotiation** (90% chance) - Négociation des conditions
6. **closed_won** (100% chance) ✅ - **GAGNÉ** → Devient CLIENT
7. **closed_lost** (0% chance) ❌ - Perdu

### Exemple concret
```
Titre: "Transport mensuel TechCorp - Matériel IT"
Lead: Jean Dupont (TechCorp)
Valeur: 60,000 TND (5000 TND/mois × 12 mois)
Probabilité: 75%
Étape: proposal
Date de clôture prévue: 2025-11-15
Assigné à: Commercial Mahdi

Description:
- Transport régulier Tunis → Sousse
- 4 fois par semaine
- Matériel informatique fragile
- Besoin d'assurance tous risques
- Véhicule requis: Camion 3.5T avec hayon
```

### Lien Prospect → Opportunité
- Une opportunité **référence un prospect** via `lead_id`
- Quand un prospect est qualifié, on crée une opportunité
- L'opportunité hérite des informations du prospect
- Le statut du prospect passe à `converted`

---

## 3️⃣ **ACTIVITÉS (Activities)**

### Définition
Les **activités** sont toutes les **actions commerciales** réalisées pour faire avancer les prospects et opportunités dans le pipeline.

### Types d'activités
- 📞 **call** - Appel téléphonique
- 📧 **email** - Email envoyé
- 🤝 **meeting** - Réunion
- ✅ **task** - Tâche à faire
- 📝 **note** - Note/Mémo
- 📅 **appointment** - Rendez-vous
- 🔄 **follow_up** - Suivi
- 🎥 **demo** - Démonstration
- 📊 **presentation** - Présentation commerciale
- 💼 **negotiation** - Session de négociation
- 🏢 **visit** - Visite sur site

### À quoi sont liées les activités ?

Les activités peuvent être liées à **plusieurs entités** :

#### 1. **Activité liée à un PROSPECT (lead_id)**
```typescript
{
  type: 'call',
  title: 'Premier appel de qualification',
  leadId: 123, // ← Lié au prospect
  opportunityId: null,
  clientId: null,
  assignedTo: 5, // Commercial Mahdi
  scheduledAt: '2025-10-17 10:00:00',
  status: 'scheduled'
}
```
**Quand ?** Au début du cycle, quand on prospecte
**Exemples :**
- Appel de découverte
- Email de prise de contact
- Rendez-vous de qualification

---

#### 2. **Activité liée à une OPPORTUNITÉ (opportunity_id)**
```typescript
{
  type: 'presentation',
  title: 'Présentation offre transport TechCorp',
  leadId: 123, // On peut garder la référence au prospect
  opportunityId: 456, // ← Lié à l'opportunité
  clientId: null,
  assignedTo: 5,
  scheduledAt: '2025-10-20 14:00:00',
  status: 'scheduled'
}
```
**Quand ?** Pendant la négociation de la vente
**Exemples :**
- Présentation de l'offre commerciale
- Réunion de négociation
- Visite du site client
- Envoi du devis (task)
- Suivi après envoi du devis

---

#### 3. **Activité liée à un CLIENT (client_id)**
```typescript
{
  type: 'meeting',
  title: 'Réunion trimestrielle - Satisfaction client',
  leadId: null,
  opportunityId: null,
  clientId: 789, // ← Lié au client existant
  assignedTo: 5,
  scheduledAt: '2025-11-05 15:00:00',
  status: 'scheduled'
}
```
**Quand ?** Après la vente, pour la fidélisation
**Exemples :**
- Suivi de satisfaction
- Renouvellement de contrat
- Upselling (vente additionnelle)

---

#### 4. **Activité liée à un DEVIS (quote_id)** *(À implémenter)*
```typescript
{
  type: 'follow_up',
  title: 'Suivi devis #QUO-2025-001',
  opportunityId: 456,
  quoteId: 12, // ← Lié au devis
  assignedTo: 5,
  scheduledAt: '2025-10-25 09:00:00',
  status: 'scheduled'
}
```
**Quand ?** Après l'envoi d'un devis
**Exemples :**
- Relance après envoi du devis
- Réponse aux questions sur le devis
- Négociation des prix

---

## 🔄 **Flux complet d'un cycle de vente**

### Étape 1 : PROSPECTION
```
Action: Un prospect remplit le formulaire du site web
Résultat: Création d'un LEAD (Prospect)

Lead créé:
- full_name: "Jean Dupont"
- company: "TechCorp SARL"
- email: "j.dupont@techcorp.tn"
- status: "new"
- assigned_to: Commercial Mahdi (ID: 5)
```

### Étape 2 : PREMIER CONTACT
```
Action: Le commercial appelle le prospect
Résultat: Création d'une ACTIVITÉ

Activité créée:
- type: "call"
- title: "Premier appel de découverte TechCorp"
- leadId: 123
- opportunityId: null
- status: "completed"
- outcome: "Besoin confirmé: transport régulier Tunis-Sousse, 
           budget OK, décision en novembre"
- next_steps: "Envoyer une présentation de nos services"
- follow_up_date: "2025-10-18"
```

Le statut du prospect passe à : `contacted`

### Étape 3 : QUALIFICATION
```
Action: Le commercial qualifie le besoin
Résultat: 
1. Mise à jour du LEAD → status = "qualified"
2. Création d'une OPPORTUNITÉ

Opportunité créée:
- title: "Transport mensuel TechCorp - Matériel IT"
- leadId: 123 ← Référence au prospect
- value: 60000 TND
- stage: "qualification"
- probability: 25%
- assigned_to: 5
```

### Étape 4 : ANALYSE DES BESOINS
```
Action: Réunion chez le client pour analyser les besoins
Résultat: Création d'une ACTIVITÉ liée à l'opportunité

Activité créée:
- type: "visit"
- title: "Visite site TechCorp - Analyse besoins transport"
- leadId: 123
- opportunityId: 456 ← Lié à l'opportunité
- status: "completed"
- outcome: "Besoin précis identifié: 4 trajets/semaine, 
           matériel fragile, besoin hayon et assurance"
```

L'opportunité avance : `stage` = "needs_analysis", `probability` = 50%

### Étape 5 : PROPOSITION COMMERCIALE
```
Action: Envoi du devis
Résultat: Création d'un DEVIS (Quote) *(à implémenter)*

Devis créé:
- quote_number: "QUO-2025-001"
- opportunityId: 456
- leadId: 123
- total: 60000 TND
- status: "sent"
- valid_until: "2025-11-15"
```

L'opportunité avance : `stage` = "proposal", `probability` = 75%

### Étape 6 : NÉGOCIATION
```
Action: Appel de suivi après envoi du devis
Résultat: Création d'une ACTIVITÉ

Activité créée:
- type: "negotiation"
- title: "Négociation conditions devis QUO-2025-001"
- opportunityId: 456
- quoteId: 12 ← Lié au devis
- status: "completed"
- outcome: "Client demande réduction 5% si engagement 12 mois"
- next_steps: "Réviser le devis avec remise volume"
```

L'opportunité avance : `stage` = "negotiation", `probability` = 90%

### Étape 7 : SIGNATURE (GAGNÉ!)
```
Action: Le client accepte le devis
Résultat: 
1. Opportunité → stage = "closed_won"
2. Lead → status = "converted"
3. Création/Mise à jour du CLIENT dans la table `client`
4. Possible création d'une activité de célébration 🎉
```

### Étape 8 : FIDÉLISATION CLIENT
```
Action: Suivi régulier du client
Résultat: Création d'ACTIVITÉS liées au client

Activité créée:
- type: "meeting"
- title: "Réunion trimestrielle - Satisfaction TechCorp"
- clientId: 789 ← Lié au client (plus à l'opportunité)
- opportunityId: null
- status: "scheduled"
- scheduledAt: "2025-12-15 10:00:00"
```

---

## 📊 **Statistiques et Rapports**

### Dashboard Commercial
```
Mes prospects:
- 15 nouveaux (new)
- 8 contactés (contacted)
- 5 qualifiés (qualified)
- 2 en maturation (nurturing)

Mes opportunités:
- 3 en prospection (prospecting) - 15,000 TND
- 2 en qualification (qualification) - 40,000 TND
- 1 en analyse (needs_analysis) - 60,000 TND
- 1 en proposition (proposal) - 75,000 TND
- 1 en négociation (negotiation) - 50,000 TND

Total pipeline: 240,000 TND
Valeur pondérée: 132,500 TND (probabilité appliquée)

Mes activités:
- 3 planifiées aujourd'hui
- 2 en retard (overdue)
- 12 complétées ce mois
```

---

## 🎓 **Bonnes Pratiques**

### 1. Toujours lier les activités
❌ **Mauvais :**
```typescript
{
  type: 'call',
  title: 'Appel client',
  // Aucun lien !
}
```

✅ **Bon :**
```typescript
{
  type: 'call',
  title: 'Appel de suivi TechCorp',
  leadId: 123, // OU opportunityId: 456, OU clientId: 789
  assignedTo: 5
}
```

### 2. Compléter les résultats
Après chaque activité terminée, remplir :
- `outcome` : Qu'est-ce qui s'est passé ?
- `next_steps` : Prochaines actions
- `follow_up_date` : Quand relancer ?

### 3. Progression logique
```
Lead (new) 
  → Activité: call 
  → Lead (contacted)
  → Activité: meeting
  → Lead (qualified)
  → Création Opportunity
  → Activité: presentation
  → Opportunity (proposal)
  → Activité: negotiation
  → Opportunity (closed_won)
  → Création Client
```

---

## 🔧 **Implémentation dans l'interface**

### Page Prospects
- Liste des prospects
- Bouton "Créer une activité" pour un prospect
- Bouton "Convertir en opportunité" (si qualified)
- Historique des activités liées

### Page Opportunités
- Kanban par étape (stage)
- Bouton "Créer une activité" pour une opportunité
- Bouton "Générer un devis" *(à implémenter)*
- Historique des activités liées

### Page Activités
- Liste de toutes les activités
- Filtre par type, statut, date
- **Champ "Lié à" avec sélection**:
  - Prospect (lead_id)
  - Opportunité (opportunity_id)
  - Client (client_id)
  - Devis (quote_id) *(futur)*
- Assign à un commercial

### Formulaire de création d'activité
```typescript
{
  type: 'meeting', // Select
  title: 'Réunion...', // Input
  description: '...', // Textarea
  
  // Section "Lié à" (Radio buttons)
  linkedTo: 'opportunity', // 'lead' | 'opportunity' | 'client' | 'quote'
  
  // Select dynamique selon linkedTo
  linkedEntityId: 456, // ID de l'opportunité
  
  assignedTo: 5, // Select des commerciaux
  scheduledAt: '2025-10-20 14:00',
  duration: 60, // minutes
  location: 'Bureau TechCorp',
  priority: 'high'
}
```

---

## 📈 **Métriques Clés**

### Taux de conversion
```
Leads → Opportunities: (Qualified Leads / Total Leads) × 100
Opportunities → Clients: (Closed Won / Total Opportunities) × 100
```

### Vélocité des ventes
```
Temps moyen: Lead → Opportunity → Client
Exemple: 15 jours → 45 jours = 60 jours total
```

### Activités par opportunité
```
Moyenne: 8 activités par opportunité gagnée
Plus d'activités = Plus de chances de gagner
```

---

## ✅ **Résumé**

| Entité | Rôle | Exemple |
|--------|------|---------|
| **Prospect (Lead)** | Contact potentiel | Jean Dupont de TechCorp |
| **Opportunité** | Vente en cours | Transport TechCorp - 60k TND |
| **Activité** | Action commerciale | Appel, Réunion, Email |
| **Devis** | Proposition tarifée | QUO-2025-001 |
| **Client** | Vente gagnée | TechCorp (contrat actif) |

**Les activités sont le cœur du CRM** : elles documentent toutes les interactions et font avancer les prospects dans le pipeline jusqu'à la signature ! 🎯

