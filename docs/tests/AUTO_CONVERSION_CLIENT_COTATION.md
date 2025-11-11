# Conversion Automatique Prospect/Opportunité vers Client Temporaire

## 📋 Vue d'ensemble

Cette fonctionnalité permet la **conversion automatique** d'un prospect (Lead) ou d'une opportunité en **client TEMPORAIRE** lorsqu'une **cotation est acceptée**.

## 🎯 Objectif

Automatiser le processus de conversion des prospects/opportunités en clients dans la base de données après l'acceptation d'une cotation, SANS création de compte utilisateur (pas de mot de passe, pas de Keycloak).

## 🔄 Flux de Conversion

### Déclenchement
La conversion est déclenchée automatiquement lors de l'acceptation d'une cotation via l'endpoint:
```
POST /api/crm/quotes/:id/accept
```

### Scénarios de Conversion

#### Scénario 1: Cotation liée à un Lead (Prospect)
```
Lead → Cotation Acceptée → Client Temporaire (SANS compte web)
```

**Étapes:**
1. Récupération des données du lead
2. Mapping des champs lead → client
3. Création du client TEMPORAIRE (is_permanent = false)
4. ⚠️ **AUCUN** compte Keycloak créé
5. ⚠️ **AUCUN** mot de passe généré
6. ⚠️ **AUCUN** email envoyé
7. Mise à jour de la cotation avec le nouveau clientId

**Mapping des données:**
| Lead              | Client            |
|-------------------|-------------------|
| company           | nom               |
| fullName          | interlocuteur     |
| email             | contact_mail1     |
| phone             | contact_tel1      |
| street            | adresse           |
| postalCode        | code_postal       |
| city              | ville             |
| country           | pays              |
| industry          | nature            |

#### Scénario 2: Cotation liée à une Opportunité
```
Opportunité → Cotation Acceptée → Client Temporaire (SANS compte web)
```

**Étapes:**
1. Récupération de l'opportunité avec son lead lié
2. Si lead existe: utiliser les données du lead (comme scénario 1)
3. Sinon: utiliser les données de la cotation pour créer un client temporaire

#### ⚠️ Scénario 3: Cotation avec Client Existant
```
Client Existant → Cotation Acceptée → AUCUNE création
```

**Important:**
- Si la cotation est déjà liée à un client existant, AUCUNE conversion n'est effectuée
- Les clients existants restent inchangés (qu'ils soient permanents ou temporaires)

**Mapping des données:**
| Quote             | Client            |
|-------------------|-------------------|
| clientCompany     | nom               |
| clientName        | interlocuteur     |
| clientEmail       | contact_mail1     |
| clientPhone       | contact_tel1      |
| clientAddress     | adresse           |
| country           | pays              |

## 🔐 Type de Client Créé: TEMPORAIRE

### ⚠️ IMPORTANT: Client SANS Accès Web
Les clients créés automatiquement sont **TEMPORAIRES** :

- ❌ **Pas de mot de passe** (`mot_de_passe = null`)
- ❌ **Pas de compte Keycloak** (`keycloak_id = null`)
- ❌ **Pas d'email de bienvenue** (aucun envoi)
- ❌ **Pas d'accès au portail client**
- ✅ **is_permanent = false** (client temporaire)
- ✅ **Enregistré dans la table `client`**
- ✅ **Lié à la cotation acceptée**

### Conversion en Client Permanent
Si vous souhaitez donner un accès web au client temporaire créé:
1. Accéder à la fiche client
2. Utiliser le bouton "Rendre Permanent"
3. Un mot de passe sera généré automatiquement
4. Un compte Keycloak sera créé
5. Un email avec les identifiants sera envoyé

## 📊 Données Client par Défaut

### Paramètres Fiscaux
- **État fiscal**: `ASSUJETTI_TVA` (par défaut)
- **Timbre**: `true`
- **TVA**: 19% (par défaut)

### Paramètres de Compte
- **Statut**: `actif`
- **is_permanent**: `false` ⚠️ (CLIENT TEMPORAIRE - pas d'accès web)
- **Catégorie**: `CLIENT`
- **Type**: `PROSPECT_CONVERTI`
- **Pays**: `Tunisie` (par défaut)
- **mot_de_passe**: `null` ⚠️ (aucun mot de passe)
- **keycloak_id**: `null` ⚠️ (aucun compte Keycloak)

## 🔍 Vérifications et Sécurité

### Vérification Préalable
Avant de créer un nouveau client, le système vérifie:
1. ✅ La cotation n'est pas déjà liée à un client existant
2. ✅ La cotation provient d'un **Lead** ou d'une **Opportunité** (pas d'un client existant)
3. ✅ Les données nécessaires sont présentes (nom, email)

### Gestion des Erreurs
- Si la conversion échoue, l'acceptation de la cotation **n'échoue pas**
- Les erreurs sont loggées pour permettre une intervention manuelle si nécessaire
- L'utilisateur peut toujours créer le client manuellement

## 📝 Traçabilité

### Note de Conversion
Une note est automatiquement ajoutée à la cotation:
```
[Date/Heure] Client temporaire créé automatiquement depuis Lead/Opportunité
suite à l'acceptation de la cotation.
```

### Logs Console
Des logs détaillés sont générés pour tracer:
- 🔄 Démarrage de la conversion
- 📋 Source des données (Lead/Opportunité/Cotation)
- ✅ Succès de création
- ❌ Erreurs éventuelles

## 🛠️ Implémentation Technique

### Fichiers Modifiés

#### `quotes.service.ts`
```typescript
// Nouvelle méthode privée
private async autoConvertToClient(quote: Quote): Promise<void>
private async createTemporaryClientFromLead(lead: Lead, quote: Quote): Promise<Client>
private async createTemporaryClientFromQuote(quote: Quote): Promise<Client>

// Méthode modifiée
async acceptQuote(id: number, acceptQuoteDto: AcceptQuoteDto): Promise<Quote>
```

#### `quote.module.ts`
Ajout des dépendances:
- `ClientService`
- `AutorisationTVAService`
- `KeycloakService`
- Entités: `ContactClient`, `AutorisationTVA`

### Dépendances Injectées
```typescript
@InjectRepository(Lead)
private leadRepository: Repository<Lead>

@InjectRepository(Opportunity)
private opportunityRepository: Repository<Opportunity>

@InjectRepository(Client)
private clientRepository: Repository<Client>

private clientService: ClientService
```

## 🧪 Tests

### Test Manuel
1. Créer un lead/opportunité
2. Créer une cotation liée
3. Envoyer la cotation au client
4. Accepter la cotation (endpoint public)
5. Vérifier:
   - ✅ Client créé dans la table `client`
   - ✅ `is_permanent = true`
   - ✅ Compte Keycloak créé
   - ✅ Email envoyé
   - ✅ Cotation liée au nouveau client

### Commandes de Test
```bash
# 1. Créer un lead
POST /api/crm/leads
{
  "fullName": "Test Prospect",
  "company": "Test Company",
  "email": "test@example.com",
  "phone": "12345678"
}

# 2. Créer une cotation liée au lead
POST /api/crm/quotes
{
  "leadId": <lead_id>,
  "title": "Cotation Test",
  "clientName": "Test Prospect",
  "clientEmail": "test@example.com",
  ...
}

# 3. Accepter la cotation
POST /api/crm/quotes/:id/accept
{
  "notes": "Test acceptation"
}

# 4. Vérifier le client créé
GET /api/clients

# 5. Vérifier que le client est TEMPORAIRE
# Vérifier: is_permanent = false, mot_de_passe = null, keycloak_id = null
```

## 📌 Points d'Attention

### ⚠️ Règles Importantes
1. **Conversion uniquement pour Prospects/Opportunités**
   - La conversion s'applique SEULEMENT si la cotation provient d'un Lead ou d'une Opportunité
   - Si la cotation est liée à un client existant, AUCUNE conversion n'est faite

2. **Client Temporaire créé**
   - Le client créé est TEMPORAIRE (is_permanent = false)
   - AUCUN mot de passe n'est généré
   - AUCUN compte Keycloak n'est créé
   - AUCUN email n'est envoyé

3. **Conversion manuelle en client permanent**
   - L'utilisateur peut rendre le client permanent plus tard
   - Utiliser le bouton "Rendre Permanent" dans l'interface
   - Le système générera alors mot de passe + compte Keycloak + email

### 🔄 Améliorations Futures
- [ ] Gérer la fusion de comptes si un client similaire existe
- [ ] Permettre la personnalisation des paramètres par défaut
- [ ] Ajouter une option pour désactiver la conversion automatique
- [ ] Créer un webhook pour notifier d'autres systèmes
- [ ] Détecter les doublons avant création

## 📞 Support

Pour toute question ou problème:
1. Consulter les logs serveur
2. Vérifier la table `client` pour le nouveau client
3. Vérifier Keycloak pour le compte utilisateur
4. Contacter l'équipe technique

## 📚 Références

- [Documentation Client Service](./CLIENT_SERVICE.md)
- [Documentation Keycloak Integration](./KEYCLOAK_INTEGRATION.md)
- [Documentation Email Service](./EMAIL_SERVICE.md)
- [Documentation Quotes API](./QUOTES_API.md)
