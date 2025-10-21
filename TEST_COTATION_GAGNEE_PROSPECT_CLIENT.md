# 🧪 Test de Validation - Conversion Prospect → Client

**Date:** 21 octobre 2025  
**Objectif:** Vérifier que l'acceptation d'une cotation met à jour correctement le statut du prospect et crée un client avec les bons contacts

## 📋 Pré-requis

- Backend en cours d'exécution (`npm run start:dev`)
- Frontend en cours d'exécution (`npm start`)
- Base de données accessible
- Au moins un prospect existant dans le système

## 🎯 Scénarios de Test

### Scénario 1: Cotation depuis un Prospect Direct

#### Étape 1 - Créer un prospect de test
```
Page: CRM > Prospects > Nouveau Prospect

Données:
- Nom complet: "Test Conversion Client"
- Email: "test.conversion@example.com"
- Téléphone: "+216 71 123 456"
- Entreprise: "Société Test SARL"
- Statut: "Nouveau"
- Source: "Email"
- Priorité: "Moyenne"
```

**Résultat attendu:** Prospect créé avec ID (ex: 50)

#### Étape 2 - Créer une cotation pour ce prospect
```
Page: CRM > Cotations > Nouvelle Cotation

Données:
- Rechercher le prospect créé (ID 50)
- Titre: "Transport Test Tunis-Sfax"
- Informations client auto-remplies:
  * Nom: "Test Conversion Client"
  * Entreprise: "Société Test SARL"
  * Email: "test.conversion@example.com"
  * Téléphone: "+216 71 123 456"
- Commercial: Sélectionner un commercial
- Ajouter au moins 1 ligne de devis
- Date validité: dans 30 jours
```

**Résultat attendu:** 
- Cotation créée (ex: Q25/0629)
- Statut: "Brouillon"
- leadId = 50

#### Étape 3 - Envoyer la cotation
```
Action: Cliquer sur "Envoyer la cotation"

Données:
- Email destinataire: "test.conversion@example.com"
- Sujet: "Votre cotation Q25/0629"
- Message personnalisé (optionnel)
```

**Résultat attendu:**
- Email envoyé avec succès
- Statut cotation: "Envoyée"
- Lien public généré

#### Étape 4 - Consulter et accepter la cotation
```
Action: Ouvrir le lien public de la cotation

URL: http://localhost:4200/public/quote-view/{id}

Action: Cliquer sur "Accepter la cotation"
```

**Résultat attendu:**
- Message de confirmation
- Statut cotation → "Acceptée"

#### Étape 5 - Vérifier le prospect
```
Page: CRM > Prospects

Action: 
1. Rechercher le prospect (ID 50)
2. Utiliser le filtre statut = "Client"
```

**Résultats attendus:**
- ✅ Statut du prospect = "Devenu Client" (badge teal)
- ✅ Prospect visible dans le filtre "Client"
- ✅ Cotations associées = 1

#### Étape 6 - Vérifier le client créé
```
Page: Clients > Liste des clients

Action: Rechercher "Société Test SARL"
```

**Résultats attendus:**
- ✅ Client créé avec:
  * Nom: "Société Test SARL"
  * Interlocuteur: "Test Conversion Client"
  * Email (contact_mail1): "test.conversion@example.com"
  * Téléphone (contact_tel1): "+216 71 123 456"
  * Type: "PROSPECT_CONVERTI"
  * Statut: "actif"
  * is_permanent: false
  * Aucun mot de passe ni compte Keycloak

#### Étape 7 - Vérifier la liaison cotation-client
```
Page: CRM > Cotations

Action: Ouvrir la cotation Q25/0629
```

**Résultats attendus:**
- ✅ Section "Origine de la cotation":
  * Prospect: ID 50 - Test Conversion Client
- ✅ clientId renseigné (ex: 123)
- ✅ Note de conversion dans les notes

---

### Scénario 2: Cotation depuis une Opportunité

#### Étape 1 - Créer un prospect
```
Même processus que Scénario 1, Étape 1
Nom: "Test Opportunité Client"
Email: "test.opportunite@example.com"
```

#### Étape 2 - Convertir en opportunité
```
Page: CRM > Prospects

Action: Cliquer sur "Convertir en opportunité"

Données:
- Titre: "Opportunité Transport Maritime"
- Valeur: 5000 TND
- Probabilité: 50%
- Type transport: "Maritime"
```

**Résultat attendu:**
- Opportunité créée (ex: ID 30)
- Statut prospect → "Converti"

#### Étape 3 - Créer cotation depuis l'opportunité
```
Page: CRM > Cotations > Nouvelle Cotation

Action: 
- Rechercher l'opportunité (ID 30)
- Compléter les informations
```

**Résultat attendu:**
- Cotation créée avec opportunityId = 30
- leadId automatiquement renseigné

#### Étape 4 - Envoyer et accepter
```
Même processus que Scénario 1, Étapes 3-4
```

#### Étape 5 - Vérifications

**Opportunité:**
- ✅ Statut → "CLOSED_WON" (Gagnée)
- ✅ Description mise à jour

**Prospect:**
- ✅ Statut → "Devenu Client"
- ✅ Visible dans filtre "Client"

**Client:**
- ✅ Créé avec contact_mail1 et contact_tel1
- ✅ Type: "PROSPECT_CONVERTI"

---

### Scénario 3: Cotation Directe (sans prospect)

#### Étape 1 - Créer cotation directe
```
Page: CRM > Cotations > Nouvelle Cotation

Action: Ne pas rechercher de prospect/opportunité

Données:
- Titre: "Transport Direct Test"
- Nom client: "Client Direct Test"
- Email: "direct.test@example.com"
- Téléphone: "+216 71 999 888"
- Entreprise: "Direct Company"
```

**Résultat attendu:**
- Cotation créée sans leadId ni opportunityId

#### Étape 2 - Envoyer et accepter
```
Même processus que Scénario 1, Étapes 3-4
```

#### Étape 3 - Vérifications

**Client:**
- ✅ Client créé
- ✅ contact_mail1: "direct.test@example.com"
- ✅ contact_tel1: "+216 71 999 888"
- ✅ Type: "PROSPECT_CONVERTI"

**Prospect:**
- ⚠️ Aucun prospect créé (normal)

---

## 🔍 Vérification Base de Données

### Requête SQL - Vérifier le prospect

```sql
SELECT 
  id,
  full_name,
  email,
  phone,
  company,
  status,
  created_at,
  updated_at
FROM crm_leads
WHERE email = 'test.conversion@example.com';
```

**Résultat attendu:**
```
id | full_name              | status | company
50 | Test Conversion Client | client | Société Test SARL
```

### Requête SQL - Vérifier le client créé

```sql
SELECT 
  id,
  nom,
  interlocuteur,
  contact_mail1,
  contact_tel1,
  type_client,
  is_permanent,
  mot_de_passe,
  keycloak_id
FROM clients
WHERE contact_mail1 = 'test.conversion@example.com';
```

**Résultat attendu:**
```
id  | nom                 | contact_mail1                | contact_tel1     | type_client       | is_permanent
123 | Société Test SARL   | test.conversion@example.com  | +216 71 123 456  | PROSPECT_CONVERTI | false
```

### Requête SQL - Vérifier la cotation

```sql
SELECT 
  id,
  quote_number,
  title,
  lead_id,
  opportunity_id,
  client_id,
  status,
  client_email,
  client_phone
FROM quotes
WHERE client_email = 'test.conversion@example.com';
```

**Résultat attendu:**
```
id | quote_number | lead_id | opportunity_id | client_id | status   | client_email                 | client_phone
42 | Q25/0629     | 50      | NULL           | 123       | accepted | test.conversion@example.com  | +216 71 123 456
```

---

## 📊 Checklist de Validation

### Backend
- [ ] ✅ Méthode `acceptQuote()` appelle `autoConvertToClient()`
- [ ] ✅ Méthode `autoConvertToClient()` appelle `updateLeadStatusToClient()`
- [ ] ✅ Méthode `updateLeadStatusToClient()` met à jour le statut → CLIENT
- [ ] ✅ Méthode `createTemporaryClientFromQuote()` utilise `contact_mail1`
- [ ] ✅ Méthode `createTemporaryClientFromQuote()` utilise `contact_tel1`
- [ ] ✅ Logs affichés dans la console backend

### Frontend
- [ ] ✅ Enum `LeadStatus.CLIENT` défini
- [ ] ✅ Label "Devenu Client" affiché
- [ ] ✅ Filtre "Client" disponible dans la liste prospects
- [ ] ✅ Badge couleur distinctive pour statut "Client"
- [ ] ✅ Section "Origine cotation" affiche le prospect

### Base de Données
- [ ] ✅ Table `crm_leads` : colonne `status` mise à jour
- [ ] ✅ Table `clients` : nouveau client créé
- [ ] ✅ Table `clients` : `contact_mail1` renseigné
- [ ] ✅ Table `clients` : `contact_tel1` renseigné
- [ ] ✅ Table `clients` : `is_permanent` = false
- [ ] ✅ Table `quotes` : `client_id` mis à jour

---

## 🐛 Dépannage

### Problème 1: Statut prospect ne change pas

**Cause possible:** Erreur dans `updateLeadStatusToClient()`

**Solution:**
1. Vérifier les logs backend
2. S'assurer que `leadId` ou `opportunityId` est bien renseigné
3. Vérifier que la relation `opportunity.lead` est chargée

### Problème 2: Email dans mauvais champ

**Cause possible:** Ancien code utilisant `cliente`

**Solution:**
1. Vérifier que `createTemporaryClientFromQuote()` utilise bien `contact_mail1`
2. Vérifier la structure de la table `clients`

### Problème 3: Filtre "Client" ne fonctionne pas

**Cause possible:** Frontend pas à jour

**Solution:**
1. Vider le cache du navigateur
2. Redémarrer le serveur de développement
3. Vérifier que l'option `<option value="client">` existe

---

## ✅ Résultat Final Attendu

Après avoir suivi tous les scénarios de test :

### Dashboard Prospects
```
Filtres:
[ Tous les statuts ▼ ] → Sélectionner "Client"

Résultats:
┌──────┬─────────────────────────┬──────────────────┬──────────────┐
│ ID   │ Nom                     │ Statut           │ Cotations    │
├──────┼─────────────────────────┼──────────────────┼──────────────┤
│ 50   │ Test Conversion Client  │ 🟢 Devenu Client │ 1 (Acceptée) │
│ 51   │ Test Opportunité Client │ 🟢 Devenu Client │ 1 (Acceptée) │
└──────┴─────────────────────────┴──────────────────┴──────────────┘
```

### Dashboard Clients
```
Liste des clients (2 nouveaux):

┌──────┬─────────────────────┬────────────────────────────┬──────────────────┬─────────────────────┐
│ ID   │ Société             │ Email (contact_mail1)       │ Tél (contact_tel1)│ Type                │
├──────┼─────────────────────┼────────────────────────────┼──────────────────┼─────────────────────┤
│ 123  │ Société Test SARL   │ test.conversion@example.com │ +216 71 123 456  │ PROSPECT_CONVERTI   │
│ 124  │ Test Opportunité SA │ test.opportunite@example.com│ +216 71 456 789  │ PROSPECT_CONVERTI   │
└──────┴─────────────────────┴────────────────────────────┴──────────────────┴─────────────────────┘
```

### Logs Backend (extrait)
```
🔄 Vérification de conversion automatique pour cotation Q25/0629...
📊 Quote clientId: null, leadId: 50, opportunityId: null
🎯 Mise à jour directe du prospect ID: 50
✅ Statut du prospect après mise à jour: client
✅ Email enregistré dans contact_mail1: test.conversion@example.com
✅ Téléphone enregistré dans contact_tel1: +216 71 123 456
✅ Client temporaire créé avec succès! ID: 123
✅ Cotation Q25/0629 mise à jour avec le client ID: 123
```

---

## 📝 Conclusion du Test

Si tous les scénarios passent avec succès, cela confirme que :
- ✅ L'email est bien enregistré dans `contact_mail1`
- ✅ Le téléphone est bien enregistré dans `contact_tel1`
- ✅ Le statut du prospect change automatiquement vers "CLIENT"
- ✅ Le filtre "Client" fonctionne correctement
- ✅ La conversion automatique est complète et fonctionnelle
