# Configuration des Rôles Keycloak pour Velosi ERP

## Étapes de Configuration

### 1. Connexion à l'Admin Console Keycloak
- URL: http://localhost:8080/admin
- Username: admin
- Password: admin

### 2. Sélectionner le Realm ERP_Velosi
- Dans le menu déroulant en haut à gauche, sélectionner "ERP_Velosi"

### 3. Créer les Rôles Realm

#### Aller dans "Realm Roles" dans le menu de gauche

Créer les rôles suivants :

#### a) Rôle "personnel"
- Name: `personnel`
- Description: `Employé de l'entreprise Velosi`
- Composite: false

#### b) Rôle "client"
- Name: `client`
- Description: `Client de l'entreprise Velosi`
- Composite: false

#### c) Rôle "admin"
- Name: `admin`
- Description: `Administrateur système`
- Composite: false

#### d) Rôle "user" (optionnel)
- Name: `user`
- Description: `Utilisateur basique`
- Composite: false

### 4. Configuration du Client velosi_auth

#### Aller dans "Clients" et sélectionner "velosi_auth"

##### Settings:
- Client ID: `velosi_auth`
- Enabled: ON
- Client Protocol: `openid-connect`
- Access Type: `confidential`
- Standard Flow Enabled: ON
- Direct Access Grants Enabled: ON
- Valid Redirect URIs: `http://localhost:4200/*`
- Web Origins: `http://localhost:4200`

##### Mappers:
Créer les mappers suivants pour inclure les informations dans les tokens JWT :

1. **User Type Mapper**
   - Name: `userType`
   - Mapper Type: `User Attribute`
   - User Attribute: `userType`
   - Token Claim Name: `userType`
   - Claim JSON Type: `String`
   - Add to ID token: ON
   - Add to access token: ON

2. **Original ID Mapper**
   - Name: `originalId`
   - Mapper Type: `User Attribute`
   - User Attribute: `originalId`
   - Token Claim Name: `originalId`
   - Claim JSON Type: `String`
   - Add to ID token: ON
   - Add to access token: ON

3. **Roles Mapper**
   - Name: `realm roles`
   - Mapper Type: `User Realm Role`
   - Token Claim Name: `realm_access.roles`
   - Claim JSON Type: `String`
   - Add to ID token: ON
   - Add to access token: ON

### 5. Attribution Automatique des Rôles

#### Default Roles:
- Aller dans "Realm Settings" > "User Registration"
- Dans "Default Roles", ajouter `user`

### 6. Test de Configuration

Après synchronisation, vérifier qu'un utilisateur a :
- Le bon rôle (`personnel` ou `client`)
- Les attributs personnalisés (`userType`, `originalId`)
- L'accès aux bonnes fonctionnalités

### 7. Commandes pour la Synchronisation

```bash
# Synchroniser tous les utilisateurs
npm run keycloak:sync

# Ou via l'API REST (après démarrage du serveur)
POST http://localhost:3000/sync/keycloak/all
Authorization: Bearer <admin_token>

# Synchroniser seulement le personnel
POST http://localhost:3000/sync/keycloak/personnel

# Synchroniser seulement les clients
POST http://localhost:3000/sync/keycloak/clients

# Synchroniser un utilisateur spécifique
POST http://localhost:3000/sync/keycloak/personnel/1
POST http://localhost:3000/sync/keycloak/client/1
```

### 8. Vérification des Tokens JWT

Les tokens JWT doivent contenir :
```json
{
  "sub": "keycloak-user-id",
  "preferred_username": "username",
  "email": "user@example.com",
  "userType": "personnel", // ou "client"
  "originalId": "123", // ID de la base PostgreSQL
  "realm_access": {
    "roles": ["personnel", "user"] // ou ["client", "user"]
  }
}
```

### 9. Dépannage

#### Erreurs fréquentes :
1. **401 Unauthorized** lors de la synchronisation
   - Vérifier KEYCLOAK_ADMIN_USERNAME et KEYCLOAK_ADMIN_PASSWORD dans .env

2. **409 Conflict** - Utilisateur existe déjà
   - Normal lors de re-synchronisation

3. **Connection refused**
   - Vérifier que Keycloak est démarré sur le port 8080

#### Logs utiles :
```bash
# Logs du backend NestJS
npm run start:dev

# Logs Keycloak
# Voir dans la console où Keycloak a été démarré
```
