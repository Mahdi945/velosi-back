# 📋 Résumé - Conversion Automatique Prospect/Opportunité → Client Temporaire

## ✅ Fonctionnalité Implémentée

### Déclenchement
Lorsqu'une **cotation est acceptée**, le système vérifie automatiquement si elle provient d'un **prospect (Lead)** ou d'une **opportunité**.

### Comportement

#### ✅ CAS 1: Cotation liée à un Lead/Opportunité
```
Lead/Opportunité + Cotation Acceptée → Client TEMPORAIRE créé automatiquement
```

**Caractéristiques du client créé:**
- ✅ Enregistré dans la table `client`
- ✅ Type: `PROSPECT_CONVERTI`
- ✅ Statut: `actif`
- ❌ `is_permanent = false` (client temporaire)
- ❌ `mot_de_passe = null` (aucun mot de passe)
- ❌ `keycloak_id = null` (aucun compte Keycloak)
- ❌ Aucun email envoyé
- ❌ Aucun accès au portail web

**Données mappées:**
- Nom, email, téléphone, adresse
- Informations fiscales par défaut (TVA 19%)
- Lié automatiquement à la cotation acceptée

#### ❌ CAS 2: Cotation liée à un Client Existant
```
Client Existant + Cotation Acceptée → AUCUNE action
```

Le client existant reste inchangé. La cotation reste liée au client.

---

## 🔄 Pour Rendre un Client Permanent Plus Tard

Si vous souhaitez donner un accès web au client temporaire:

1. **Accéder à la fiche client** dans l'interface
2. **Cliquer sur "Rendre Permanent"**
3. Le système va automatiquement:
   - ✅ Générer un mot de passe sécurisé
   - ✅ Créer un compte Keycloak
   - ✅ Envoyer un email avec les identifiants
   - ✅ Mettre `is_permanent = true`

---

## 📁 Fichiers Modifiés

### Backend
- `src/crm/services/quotes.service.ts`
  - Méthode `autoConvertToClient()` - Conversion automatique
  - Méthode `createTemporaryClientFromLead()` - Mapping Lead → Client
  - Méthode `createTemporaryClientFromQuote()` - Mapping Cotation → Client

- `src/modules/crm/quote.module.ts`
  - Ajout des dépendances nécessaires (ClientService, AutorisationTVAService, etc.)

### Documentation
- `docs/AUTO_CONVERSION_CLIENT_COTATION.md` - Documentation complète
- `docs/RESUME_AUTO_CONVERSION.md` - Ce résumé

---

## 🧪 Test Rapide

```bash
# 1. Créer un lead
POST /api/crm/leads
{
  "fullName": "Test Prospect",
  "company": "Test SARL",
  "email": "test@example.com",
  "phone": "12345678"
}

# 2. Créer une cotation liée au lead
POST /api/crm/quotes
{
  "leadId": <lead_id>,
  "title": "Cotation Test",
  ...
}

# 3. Accepter la cotation
POST /api/crm/quotes/:id/accept
{
  "notes": "Test"
}

# 4. Vérifier le client créé
GET /api/clients
# Chercher le client avec type_client = "PROSPECT_CONVERTI"
# Vérifier: is_permanent = false, keycloak_id = null
```

---

## ⚠️ Points Clés à Retenir

1. ✅ Conversion **automatique** uniquement pour Leads/Opportunités
2. ✅ Client créé est **TEMPORAIRE** (sans accès web)
3. ✅ Possibilité de rendre permanent **manuellement** plus tard
4. ❌ **AUCUNE** conversion si client existant
5. ❌ **AUCUN** email envoyé lors de la création automatique

---

## 📞 Support

Pour toute question:
- Consulter la documentation complète: `docs/AUTO_CONVERSION_CLIENT_COTATION.md`
- Vérifier les logs serveur pour le détail des conversions
- Utiliser la table `client` pour voir les clients temporaires créés
