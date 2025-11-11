# Documentation des Tables CRM - Velosi Transport & Logistique

## Vue d'ensemble

Ce système CRM est conçu spécifiquement pour une société de transport et logistique. Il couvre l'ensemble du cycle de vente depuis la capture de prospects jusqu'à la conversion en clients, en passant par la gestion des opportunités, devis et activités commerciales.

## Architecture des Tables

### 🎯 1. CRM_LEADS (Prospects)
**Table principale pour la gestion des prospects**

#### Champs principaux :
- **Identité** : `full_name` (nom complet du contact), `email`, `phone`
- **Entreprise** : `company`, `position`, `website`, `industry`, `employee_count`
- **Classification** : `source`, `status`, `priority`

#### Exemple concret :
```sql
-- Contact: Ahmed Ben Ali chez Société Industrielle du Sud
full_name: "Ahmed Ben Ali"
company: "Société Industrielle du Sud"
position: "Responsable Transport"
email: "a.benali@sis.tn"
phone: "+216 70 123 456"
```
- **Transport spécifique** :
  - `transport_needs` : Types de besoins (national, international, express)
  - `annual_volume` : Volume annuel estimé de transport
  - `current_provider` : Prestataire actuel du prospect
  - `contract_end_date` : Date de fin du contrat actuel
- **Géolocalisation** : Adresse complète + indicateur local/international
- **Gestion commerciale** : Commercial assigné, valeur estimée, tags, notes

#### Statuts possibles :
- `new` : Nouveau prospect non contacté
- `contacted` : Premier contact établi
- `qualified` : Besoin qualifié et budget confirmé
- `unqualified` : Ne correspond pas aux critères
- `nurturing` : En cours de maturation
- `converted` : Converti en opportunité
- `lost` : Prospect perdu

---

### 🚀 2. CRM_OPPORTUNITIES (Opportunités)
**Gestion du pipeline de vente pour prospects qualifiés**

#### Champs principaux :
- **Base** : `title`, `description`, relation avec `lead` ou `client`
- **Valeur** : `value` (montant), `probability` (0-100%)
- **Pipeline** : `stage` (étape dans le processus de vente)
- **Transport spécifique** :
  - `origin_address`, `destination_address` : Itinéraires
  - `transport_type` : Type de transport (national, international, express...)
  - `service_frequency` : Fréquence du service
  - `vehicle_types` : Types de véhicules requis
  - `special_requirements` : Exigences particulières

#### Étapes du pipeline :
1. **Prospecting** : Identification des besoins
2. **Qualification** : Validation budget et décideurs
3. **Needs Analysis** : Analyse détaillée des besoins transport
4. **Proposal** : Envoi de la proposition/devis
5. **Negotiation** : Négociation des conditions
6. **Closed Won** : Opportunité gagnée
7. **Closed Lost** : Opportunité perdue

---

### 📋 3. CRM_QUOTES (Devis)
**Gestion des propositions commerciales**

#### Fonctionnalités :
- **Numérotation automatique** : `quote_number` unique
- **Workflow** : Draft → Sent → Viewed → Accepted/Rejected
- **Client snapshot** : Information client figée au moment du devis
- **Calculs automatiques** : Sous-total, TVA (19% Tunisie), total
- **Conditions** : Paiement, livraison, termes généraux

#### Statuts :
- `draft` : Brouillon en cours de rédaction
- `sent` : Envoyé au client
- `viewed` : Consulté par le client
- `accepted` : Accepté par le client
- `rejected` : Refusé par le client
- `expired` : Expiré (dépassé `valid_until`)
- `cancelled` : Annulé par l'entreprise

---

### 📦 4. CRM_QUOTE_ITEMS (Lignes de devis)
**Détail des services de transport proposés**

#### Spécialisation transport :
- **Itinéraire détaillé** : Origine et destination complètes
- **Caractéristiques** : Distance, poids, volume
- **Véhicules** : Type de véhicule (van, camions 3.5T à semi-remorque)
- **Services** : Enlèvement/livraison, porte-à-porte, express, emballage, assurance
- **Tarification** : Prix unitaire et total par ligne

#### Types de véhicules supportés :
- `van` : Fourgonnette
- `truck_3_5t` à `truck_26t` : Camions de différents tonnages
- `semi_trailer` : Semi-remorque
- `container` : Container maritime

---

### 📅 5. CRM_ACTIVITIES (Activités)
**Suivi de toutes les interactions commerciales**

#### Types d'activités :
- **Communication** : `call`, `email`, `meeting`
- **Actions** : `task`, `note`, `appointment`
- **Processus vente** : `follow_up`, `presentation`, `proposal`, `negotiation`
- **Terrain** : `visit`, `demo`

#### Fonctionnalités avancées :
- **Récurrence** : Activités répétitives (réunions hebdomadaires)
- **Participants multiples** : Internes et externes
- **Géolocalisation** : Lieu des rendez-vous
- **Intégration** : Liens Teams/Zoom pour réunions virtuelles
- **Suivi** : Résultats, prochaines étapes, rappels

---

### 👥 6. CRM_ACTIVITY_PARTICIPANTS (Participants)
**Gestion des participants aux activités**

#### Types de participants :
- `internal` : Employés de l'entreprise
- `client` : Clients ou prospects
- `partner` : Partenaires commerciaux
- `vendor` : Fournisseurs

#### Suivi des réponses :
- `pending` : En attente de réponse
- `accepted` : Participation confirmée
- `declined` : Participation refusée
- `tentative` : Participation probable

---

### 🔄 7. CRM_PIPELINES & CRM_PIPELINE_STAGES
**Pipelines de vente personnalisables**

#### Pipeline par défaut :
Configuration pré-établie adaptée au transport avec étapes logiques et probabilités associées.

#### Personnalisation :
- Création de pipelines spécifiques (transport express vs logistique)
- Couleurs et ordres personnalisés
- Règles d'avancement automatique
- Champs obligatoires par étape

---

### 📎 8. CRM_ATTACHMENTS (Pièces jointes)
**Gestion des documents CRM**

#### Fonctionnalités :
- Attachement à toute entité CRM (lead, opportunity, quote, activity)
- Métadonnées complètes (taille, type MIME, titre)
- Sécurité avec indicateur public/privé
- Traçabilité complète

---

### 🏷️ 9. CRM_TAGS (Étiquettes)
**Système de tags pour catégorisation**

#### Tags pré-configurés pour transport :
- **Services** : Transport Express, National, International, Logistique, Entreposage
- **Clients** : Client Premium, Urgent, Suivi Régulier
- **Personnalisables** par équipe commerciale

---

## Vues et Rapports

### 📊 VIEW_LEADS_BY_SALES
Tableau de bord par commercial :
- Nombre total de prospects
- Répartition par statut
- Valeur estimée totale

### 📈 VIEW_OPPORTUNITIES_PIPELINE
Visualisation du pipeline :
- Opportunités par étape
- Valeur totale et pondérée
- Probabilité moyenne

---

## Spécificités Transport & Logistique

### 🚚 Adaptation métier :
1. **Géographie** : Distinction local/international crucial
2. **Types de transport** : Couverture complète des services
3. **Véhicules** : Adaptation au parc Velosi
4. **Fréquences** : Gestion des contrats récurrents
5. **Itinéraires** : Traçabilité origine/destination

### 📋 Workflow optimisé :
1. **Capture lead** → Source (web, appel, salon)
2. **Qualification** → Validation besoins transport
3. **Analyse** → Étude itinéraires et contraintes
4. **Devis** → Proposition détaillée par ligne
5. **Négociation** → Ajustements prix/conditions
6. **Conversion** → Création client + première mission

---

## Performances et Scalabilité

### 🔍 Indexation optimisée :
- Index sur champs de recherche fréquents
- Index composites pour requêtes complexes
- Index sur clés étrangères pour jointures

### 🔄 Triggers automatiques :
- Mise à jour automatique des timestamps
- Calculs automatiques des totaux
- Notifications sur changements d'état

### 📊 Rapports en temps réel :
- Vues matérialisées pour performances
- Statistiques pré-calculées
- Tableaux de bord réactifs

---

## Sécurité et Audit

### 🔐 Traçabilité complète :
- Qui a créé/modifié chaque enregistrement
- Horodatage précis de toutes les actions
- Historique des changements d'état

### 👤 Gestion des droits :
- Attribution par rôle (commercial, administratif)
- Visibilité selon affectation
- Audit trail complet

---

Cette architecture CRM robuste permet à Velosi de gérer efficacement son cycle commercial tout en s'adaptant aux spécificités du métier transport et logistique.