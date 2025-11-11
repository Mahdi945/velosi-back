# Guide de Démarrage Rapide - Intégration Keycloak

## Résumé de la Solution Implémentée

Nous avons implémenté une solution hybride qui combine :
1. **Synchronisation automatique** : Les nouveaux utilisateurs sont automatiquement créés dans Keycloak
2. **Authentification sécurisée** : Keycloak gère l'authentification avec ses standards de sécurité
3. **Données existantes** : Vos tables PostgreSQL restent la source de vérité

## Étapes de Mise en Route

### 1. Prérequis
- Keycloak en cours d'exécution sur http://localhost:8080
- Base PostgreSQL avec vos données existantes
- Backend NestJS configuré

### 2. Configuration Keycloak
Suivre le guide : `docs/KEYCLOAK_ROLES_SETUP.md`

### 3. Variables d'Environnement
Vérifier que votre `.env` contient :
```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
```

### 4. Synchronisation Initiale
```bash
# Démarrer le backend
npm run start:dev

# Dans un autre terminal, synchroniser tous les utilisateurs existants
npm run keycloak:sync
```

### 5. Test de l'Authentification

#### Via l'API :
```bash
# Tester la connexion d'un utilisateur
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "BH",
    "password": "motdepasse"
  }'
```

#### Via le Frontend :
- L'utilisateur sera authentifié via Keycloak
- Le guard ne devrait plus rediriger vers /login
- Les tokens JWT contiendront les rôles appropriés

## Avantages de cette Solution

### ✅ Sécurité Keycloak
- Standards OAuth2/OIDC
- Gestion centralisée des sessions
- Politiques de mot de passe
- Audit et logging

### ✅ Données Existantes Préservées
- Vos tables PostgreSQL restent intactes
- Pas de migration complexe
- Possibilité de rollback facile

### ✅ Synchronisation Automatique
- Nouveaux utilisateurs → automatiquement dans Keycloak
- Modifications → peuvent être synchronisées
- Flexibilité pour ajustements futurs

## Prochaines Étapes Optionnelles

### Option A: User Storage Provider SPI (Recommandé pour production)
Si vous voulez une intégration plus profonde :
- Keycloak lit directement vos tables PostgreSQL
- Authentification en temps réel
- Pas besoin de synchronisation

### Option B: Synchronisation Bidirectionnelle
- Modifications dans Keycloak → mises à jour dans PostgreSQL
- Webhooks ou polling pour synchronisation

## Dépannage Rapide

### Problème: "Utilisateur non authentifié, redirection vers /login"
**Solution :** 
- Vérifier que Keycloak est démarré
- Vérifier que l'utilisateur existe dans Keycloak
- Exécuter la synchronisation : `npm run keycloak:sync`

### Problème: Erreurs de synchronisation
**Solution :**
- Vérifier les credentials admin dans `.env`
- Vérifier que le realm `ERP_Velosi` existe
- Vérifier les logs : `npm run start:dev`

### Problème: Tokens invalides
**Solution :**
- Vérifier la configuration du client `velosi_auth`
- Vérifier les mappers dans Keycloak
- Redémarrer le backend

## Test Final

Après configuration, un utilisateur existant de votre base (ex: "BH") devrait :
1. ✅ Pouvoir se connecter via l'interface
2. ✅ Être authentifié par Keycloak
3. ✅ Avoir les bons rôles dans le token JWT
4. ✅ Accéder aux pages protégées sans redirection

## Support

En cas de problème :
1. Vérifier les logs backend : console où `npm run start:dev` s'exécute
2. Vérifier les logs Keycloak : console d'administration Keycloak
3. Tester la synchronisation manuelle : `npm run keycloak:sync`
4. Vérifier la configuration avec le guide `KEYCLOAK_ROLES_SETUP.md`
