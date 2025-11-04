# ✅ Intégration Keycloak - Implémentation Complète

## 📋 Résumé de l'implémentation

### Code Backend Implémenté

#### 1. **AuthService** - Méthodes de gestion de sessions ajoutées ✅

Fichier: `src/auth/auth.service.ts`

**Nouvelles méthodes implémentées:**

1. **`getPersonnelSessions(personnelId: number)`**
   - Récupère toutes les sessions actives d'un personnel
   - Retourne: ID personnel, nom, prénom, email, keycloak_id, liste des sessions
   - Gestion d'erreur: NotFoundException si personnel introuvable ou non synchronisé

2. **`getPersonnelActivity(personnelId: number)`**
   - Récupère l'historique d'activité depuis Keycloak
   - Retourne: Informations personnel + statistiques d'activité (lastLoginDate, totalSessions, activeSessions, accountCreated)
   - Gestion d'erreur: NotFoundException si personnel introuvable ou non synchronisé

3. **`closePersonnelSessions(personnelId: number)`**
   - Ferme toutes les sessions actives d'un personnel (déconnexion forcée)
   - Retourne: Message de succès avec identifiants
   - Gestion d'erreur: NotFoundException si personnel introuvable ou non synchronisé

4. **`getClientSessions(clientId: number)`**
   - Récupère toutes les sessions actives d'un client permanent
   - Retourne: ID client, nom, email (depuis contact_client.mail1), is_permanent, keycloak_id, liste des sessions
   - Gestion d'erreur: NotFoundException si client introuvable, non synchronisé ou temporaire

5. **`closeClientSessions(clientId: number)`**
   - Ferme toutes les sessions actives d'un client permanent
   - Retourne: Message de succès avec identifiants
   - Gestion d'erreur: NotFoundException si client introuvable ou non synchronisé

#### 2. **AuthController** - Endpoints REST ajoutés ✅

Fichier: `src/auth/auth.controller.ts`

**Nouveaux endpoints disponibles:**

```typescript
GET    /auth/personnel/:id/sessions     → Récupérer sessions actives personnel
GET    /auth/personnel/:id/activity     → Récupérer activité personnel
DELETE /auth/personnel/:id/sessions     → Fermer toutes sessions personnel
GET    /auth/client/:id/sessions        → Récupérer sessions actives client
DELETE /auth/client/:id/sessions        → Fermer toutes sessions client
```

#### 3. **Script de Migration** - Synchronisation BD → Keycloak ✅

Fichier: `src/scripts/sync-users-to-keycloak.ts`

**Fonctionnalités:**
- Synchronise tous les personnels actifs (statut='actif')
- Synchronise uniquement les clients permanents actifs (is_permanent=true ET statut='actif')
- Crée les utilisateurs dans Keycloak avec mot de passe temporaire
- Assigne les rôles appropriés (commercial, administratif, chauffeur, exploitation, finance, client)
- Sauvegarde keycloak_id dans la base de données PostgreSQL
- Gestion d'erreurs robuste avec logs détaillés
- Statistiques de migration complètes

**Commande d'exécution:**
```bash
npm run sync:keycloak
```

---

## 🔧 Étapes de Configuration et Test

### Phase 1: Configuration Keycloak (Manuel)

#### Étape 1.1: Accès à l'administration Keycloak
```
URL: http://localhost:8080/admin
Username: admin
Password: 87Eq8384
```

#### Étape 1.2: Créer le Realm
1. Cliquer sur le menu déroulant du realm (en haut à gauche)
2. Cliquer sur "Create Realm"
3. **Realm name:** `ERP_Velosi`
4. **Enabled:** `ON`
5. Cliquer sur "Create"

#### Étape 1.3: Configurer les sessions du Realm
1. Aller dans Realm Settings → Sessions
2. Configurer les timeouts:
   - **SSO Session Idle:** `8 Hours`
   - **SSO Session Max:** `10 Hours`
   - **Client Session Idle:** `8 Hours`
   - **Client Session Max:** `10 Hours`
   - **Offline Session Idle:** `30 Days`
3. Cliquer sur "Save"

#### Étape 1.4: Créer le Client
1. Aller dans Clients → Create client
2. **General Settings:**
   - Client type: `OpenID Connect`
   - Client ID: `velosi_auth`
3. Cliquer sur "Next"
4. **Capability config:**
   - Client authentication: `ON`
   - Authorization: `OFF`
   - Authentication flow:
     - ☑ Standard flow
     - ☑ Direct access grants
     - ☐ Implicit flow
5. Cliquer sur "Next"
6. **Login settings:**
   - Root URL: `http://localhost:4200` (frontend Angular)
   - Valid redirect URIs: `http://localhost:4200/*`
   - Web origins: `http://localhost:4200`
7. Cliquer sur "Save"

#### Étape 1.5: Configurer le Client Secret
1. Dans l'onglet "Credentials" du client `velosi_auth`
2. Copier le **Client Secret** affiché
3. **IMPORTANT:** Vérifier que le secret correspond à celui dans `.env`
   ```
   KEYCLOAK_CLIENT_SECRET=0SW8TshHXXdLEjpsBVCnQ4HvcSBbc2mN
   ```
4. Si différent, mettre à jour le secret dans Keycloak:
   - Cliquer sur "Regenerate Secret"
   - OU mettre à jour le `.env` avec le nouveau secret

#### Étape 1.6: Créer les Rôles (Realm Roles)
1. Aller dans Realm roles → Create role
2. Créer les 6 rôles suivants:

**Rôles Personnel:**
- **Role name:** `commercial` → Create
- **Role name:** `administratif` → Create
- **Role name:** `chauffeur` → Create
- **Role name:** `exploitation` → Create
- **Role name:** `finance` → Create

**Rôle Client:**
- **Role name:** `client` → Create

#### Étape 1.7: Vérification visuelle
- [ ] Realm `ERP_Velosi` créé et activé
- [ ] Client `velosi_auth` configuré avec authentication ON
- [ ] Client secret correspond au `.env`
- [ ] 6 rôles créés (commercial, administratif, chauffeur, exploitation, finance, client)
- [ ] Sessions configurées (8h idle, 10h max)

---

### Phase 2: Migration des Utilisateurs Existants

#### Étape 2.1: Vérifier l'environnement backend
```bash
cd c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
```

Vérifier que le backend n'est PAS en cours d'exécution (pour éviter les conflits de connexion BD).

#### Étape 2.2: Vérifier la configuration .env
Ouvrir `.env` et confirmer:
```env
# Supabase PostgreSQL
DB_HOST=aws-0-eu-north-1.pooler.supabase.com
DB_PORT=5432
DB_USERNAME=postgres.aswqsbrpkofmhgqjmyuw
DB_PASSWORD=87Eq8384
DB_NAME=postgres

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=0SW8TshHXXdLEjpsBVCnQ4HvcSBbc2mN
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
```

#### Étape 2.3: Installer les dépendances (si nécessaire)
```bash
npm install
```

#### Étape 2.4: Exécuter le script de migration
```bash
npm run sync:keycloak
```

**Sortie attendue:**
```
🔄 Démarrage de la synchronisation des utilisateurs vers Keycloak...
================================================

📊 Phase 1: Synchronisation des Personnels
------------------------------------------
✅ Personnel synchronisé: Jean Dupont (commercial) → Keycloak ID: abc-123-def
✅ Personnel synchronisé: Marie Martin (administratif) → Keycloak ID: xyz-456-ghi
⚠️  Personnel déjà synchronisé, ignoré: Pierre Durand

📊 Phase 2: Synchronisation des Clients Permanents
--------------------------------------------------
✅ Client permanent synchronisé: ACME Corp → Keycloak ID: jkl-789-mno
⚠️  Client temporaire ignoré: TempClient (is_permanent=false)

================================================
📊 Résumé de la Migration
================================================
Personnel synchronisés: 15/18
Clients permanents synchronisés: 8/25
Erreurs: 0
Total utilisateurs dans Keycloak: 23
================================================
```

#### Étape 2.5: Vérification dans Keycloak
1. Retourner dans l'admin Keycloak: http://localhost:8080/admin
2. Realm: `ERP_Velosi` → Users → View all users
3. Vérifier:
   - Les personnels actifs sont présents
   - Les clients permanents actifs sont présents
   - Les rôles sont correctement assignés (cliquer sur un user → Role mapping)
   - Le keycloak_id a été sauvegardé en BD (vérifier avec DBeaver/pgAdmin)

#### Étape 2.6: Vérification dans PostgreSQL (Supabase)
Connecter à la base avec DBeaver/pgAdmin et exécuter:

```sql
-- Vérifier les personnels synchronisés
SELECT id, nom, prenom, email, role, statut, keycloak_id 
FROM personnel 
WHERE statut = 'actif'
ORDER BY id;

-- Vérifier les clients permanents synchronisés
SELECT c.id, c.nom, c.statut, c.is_permanent, c.keycloak_id, cc.mail1
FROM client c
LEFT JOIN contact_client cc ON cc.client_id = c.id
WHERE c.is_permanent = true AND c.statut = 'actif'
ORDER BY c.id;

-- Statistiques
SELECT 
  'Personnel' as type,
  COUNT(*) as total,
  COUNT(keycloak_id) as synced,
  COUNT(*) - COUNT(keycloak_id) as not_synced
FROM personnel 
WHERE statut = 'actif'
UNION ALL
SELECT 
  'Client Permanent' as type,
  COUNT(*) as total,
  COUNT(keycloak_id) as synced,
  COUNT(*) - COUNT(keycloak_id) as not_synced
FROM client 
WHERE is_permanent = true AND statut = 'actif';
```

---

### Phase 3: Test des Endpoints de Session Management

#### Étape 3.1: Démarrer le backend NestJS
```bash
cd c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
npm run start:dev
```

Attendre le message:
```
[Nest] Application successfully started 🚀
[Nest] Listening on port 3000
```

#### Étape 3.2: Test avec Postman/Insomnia/Thunder Client

**Configuration commune:**
- Base URL: `http://localhost:3000`
- Remplacer `:id` par un ID réel de personnel/client

##### Test 1: Récupérer les sessions d'un personnel
```http
GET http://localhost:3000/auth/personnel/1/sessions
```

**Réponse attendue (200 OK):**
```json
{
  "personnelId": 1,
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@velosi.com",
  "keycloakId": "abc-123-def-456",
  "sessions": [
    {
      "id": "session-uuid-1",
      "username": "jean.dupont",
      "userId": "abc-123-def-456",
      "ipAddress": "192.168.1.100",
      "start": 1704120000000,
      "lastAccess": 1704123600000,
      "clients": {
        "velosi_auth": "client-session-id"
      }
    }
  ],
  "totalSessions": 1
}
```

##### Test 2: Récupérer l'activité d'un personnel
```http
GET http://localhost:3000/auth/personnel/1/activity
```

**Réponse attendue (200 OK):**
```json
{
  "personnelId": 1,
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@velosi.com",
  "keycloakId": "abc-123-def-456",
  "activity": {
    "lastLoginDate": "2024-01-01T14:30:00Z",
    "totalSessions": 25,
    "activeSessions": 1,
    "accountCreated": "2023-12-15T10:00:00Z",
    "lastActivity": "API Call",
    "lastActivityType": "login"
  }
}
```

##### Test 3: Fermer toutes les sessions d'un personnel
```http
DELETE http://localhost:3000/auth/personnel/1/sessions
```

**Réponse attendue (200 OK):**
```json
{
  "success": true,
  "message": "Toutes les sessions du personnel Jean Dupont ont été fermées",
  "personnelId": 1,
  "keycloakId": "abc-123-def-456"
}
```

##### Test 4: Récupérer les sessions d'un client permanent
```http
GET http://localhost:3000/auth/client/5/sessions
```

**Réponse attendue (200 OK):**
```json
{
  "clientId": 5,
  "nom": "ACME Corporation",
  "email": "contact@acme.com",
  "isPermanent": true,
  "keycloakId": "xyz-789-ghi-012",
  "sessions": [
    {
      "id": "session-uuid-2",
      "username": "acme.corp",
      "userId": "xyz-789-ghi-012",
      "ipAddress": "203.0.113.50",
      "start": 1704119000000,
      "lastAccess": 1704122600000
    }
  ],
  "totalSessions": 1
}
```

##### Test 5: Client temporaire (doit échouer)
```http
GET http://localhost:3000/auth/client/10/sessions
```

**Réponse attendue (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Client 10 n'est pas synchronisé avec Keycloak (probablement un client temporaire)",
  "error": "Not Found"
}
```

##### Test 6: Fermer sessions d'un client
```http
DELETE http://localhost:3000/auth/client/5/sessions
```

**Réponse attendue (200 OK):**
```json
{
  "success": true,
  "message": "Toutes les sessions du client ACME Corporation ont été fermées",
  "clientId": 5,
  "keycloakId": "xyz-789-ghi-012"
}
```

#### Étape 3.3: Vérification en temps réel dans Keycloak Admin
1. Ouvrir Keycloak Admin: http://localhost:8080/admin
2. Realm: `ERP_Velosi` → Users
3. Rechercher un utilisateur (par nom/email)
4. Cliquer sur le user → Onglet "Sessions"
5. Observer les sessions actives AVANT l'appel DELETE
6. Exécuter l'appel `DELETE /auth/personnel/:id/sessions`
7. Rafraîchir la page Sessions dans Keycloak
8. Vérifier que les sessions ont été fermées ✅

---

### Phase 4: Intégration Frontend (À implémenter)

#### Fichier à créer: `src/app/components/personnel-session-manager/personnel-session-manager.component.ts`

**Emplacement dans l'UI:**
- Modal de modification de personnel
- Nouvel onglet: "Contrôle de Session"

**Fonctionnalités requises:**
1. Affichage des sessions actives (tableau)
   - IP Address
   - Heure de début
   - Dernière activité
   - Durée de la session
   - Bouton "Fermer" par session

2. Statistiques d'activité
   - Dernière connexion
   - Total de sessions (historique)
   - Sessions actives actuelles
   - Date de création du compte

3. Actions globales
   - Bouton "Déconnecter toutes les sessions"
   - Confirmation avant déconnexion
   - Notification de succès/erreur

**Services Angular à appeler:**
```typescript
// Récupérer sessions
this.http.get(`/auth/personnel/${personnelId}/sessions`)

// Récupérer activité
this.http.get(`/auth/personnel/${personnelId}/activity`)

// Fermer toutes sessions
this.http.delete(`/auth/personnel/${personnelId}/sessions`)
```

#### Template de composant (exemple):
```html
<div class="session-control-tab">
  <h3>Contrôle de Session</h3>
  
  <!-- Statistiques -->
  <div class="activity-stats">
    <div class="stat-card">
      <span class="label">Dernière connexion:</span>
      <span class="value">{{ activity?.lastLoginDate | date:'short' }}</span>
    </div>
    <div class="stat-card">
      <span class="label">Sessions actives:</span>
      <span class="value">{{ sessions?.length || 0 }}</span>
    </div>
    <div class="stat-card">
      <span class="label">Total sessions (historique):</span>
      <span class="value">{{ activity?.totalSessions || 0 }}</span>
    </div>
  </div>

  <!-- Liste des sessions actives -->
  <div class="sessions-list">
    <h4>Sessions Actives</h4>
    <table>
      <thead>
        <tr>
          <th>IP Address</th>
          <th>Début</th>
          <th>Dernière activité</th>
          <th>Durée</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let session of sessions">
          <td>{{ session.ipAddress }}</td>
          <td>{{ session.start | date:'short' }}</td>
          <td>{{ session.lastAccess | date:'short' }}</td>
          <td>{{ calculateDuration(session.start, session.lastAccess) }}</td>
          <td>
            <button (click)="closeSession(session.id)" class="btn-danger-sm">
              Fermer
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Action globale -->
  <div class="global-actions">
    <button 
      (click)="closeAllSessions()" 
      class="btn-danger"
      [disabled]="!sessions || sessions.length === 0">
      🚪 Déconnecter toutes les sessions
    </button>
  </div>
</div>
```

---

## 📊 Checklist Complète de Déploiement

### Backend ✅ (Complété)
- [x] KeycloakService implémenté avec toutes les méthodes
- [x] AuthService: méthodes de session management ajoutées
- [x] AuthController: endpoints REST configurés
- [x] Script de migration créé (sync-users-to-keycloak.ts)
- [x] Package.json mis à jour avec script sync:keycloak
- [x] .env configuré avec credentials Keycloak
- [x] Import NotFoundException ajouté
- [x] Correction relation ContactClient (mail1 au lieu de email)

### Configuration Keycloak ⏳ (À faire manuellement)
- [ ] Accéder à http://localhost:8080/admin (admin/87Eq8384)
- [ ] Créer realm ERP_Velosi
- [ ] Configurer sessions (8h idle, 10h max)
- [ ] Créer client velosi_auth
- [ ] Vérifier/mettre à jour client secret
- [ ] Créer 6 rôles (commercial, administratif, chauffeur, exploitation, finance, client)

### Migration Utilisateurs ⏳ (À faire après config Keycloak)
- [ ] Vérifier .env (DB + Keycloak)
- [ ] Arrêter le backend si en cours d'exécution
- [ ] Exécuter `npm run sync:keycloak`
- [ ] Vérifier logs de migration (erreurs?)
- [ ] Vérifier users dans Keycloak Admin
- [ ] Vérifier keycloak_id dans PostgreSQL

### Tests Backend ⏳ (À faire après migration)
- [ ] Démarrer backend: `npm run start:dev`
- [ ] Test GET /auth/personnel/:id/sessions (200 OK)
- [ ] Test GET /auth/personnel/:id/activity (200 OK)
- [ ] Test DELETE /auth/personnel/:id/sessions (200 OK)
- [ ] Test GET /auth/client/:id/sessions (200 OK - client permanent)
- [ ] Test GET /auth/client/:id/sessions (404 - client temporaire)
- [ ] Test DELETE /auth/client/:id/sessions (200 OK)
- [ ] Vérifier déconnexion effective dans Keycloak Admin

### Frontend ❌ (Non commencé)
- [ ] Créer composant personnel-session-manager
- [ ] Ajouter onglet "Contrôle de Session" au modal personnel
- [ ] Implémenter affichage sessions actives
- [ ] Implémenter affichage statistiques activité
- [ ] Implémenter bouton "Fermer session"
- [ ] Implémenter bouton "Déconnecter toutes sessions"
- [ ] Ajouter confirmations/notifications
- [ ] Tests E2E de l'interface

### Déploiement Production ❌ (Non commencé)
- [ ] Configurer Keycloak sur Railway/Render
- [ ] Utiliser PostgreSQL Supabase pour Keycloak (au lieu de H2)
- [ ] Exporter configuration realm depuis Keycloak local
- [ ] Importer configuration dans Keycloak production
- [ ] Mettre à jour KEYCLOAK_URL dans .env production
- [ ] Re-exécuter migration avec BD production
- [ ] Tests complets en production

---

## 🔐 Informations de Connexion

### PostgreSQL (Supabase)
```
Host: aws-0-eu-north-1.pooler.supabase.com
Port: 5432
User: postgres.aswqsbrpkofmhgqjmyuw
Password: 87Eq8384
Database: postgres
```

### Keycloak Local
```
URL Admin: http://localhost:8080/admin
Username: admin
Password: 87Eq8384
Realm: ERP_Velosi
Client ID: velosi_auth
Client Secret: 0SW8TshHXXdLEjpsBVCnQ4HvcSBbc2mN
```

### Backend NestJS Local
```
URL: http://localhost:3000
Dev Mode: npm run start:dev
```

### Frontend Angular Local
```
URL: http://localhost:4200
Dev Mode: npm start
```

---

## 📚 Documentation Associée

- **KEYCLOAK_SETUP_GUIDE.md** - Guide détaillé de configuration Keycloak
- **ANALYSE_SYNCHRONISATION_KEYCLOAK.md** - Analyse de l'architecture de synchronisation
- **src/scripts/sync-users-to-keycloak.ts** - Code source du script de migration

---

## 🚨 Points d'Attention

### Sécurité
- ⚠️ Client secret à protéger (ne JAMAIS commit dans Git)
- ⚠️ En production, utiliser HTTPS pour Keycloak
- ⚠️ Mots de passe temporaires à changer au premier login

### Performance
- ℹ️ Les appels à l'API Keycloak peuvent être lents (réseau)
- ℹ️ Mettre en cache les informations d'activité si possible
- ℹ️ Limiter les appels getUserSessions à la demande (pas de polling)

### Base de données
- ℹ️ keycloak_id est nullable (clients temporaires n'ont pas de keycloak_id)
- ℹ️ Toujours vérifier is_permanent=true avant sync client
- ℹ️ Les personnels actifs sont toujours synchronisés

### Maintenance
- ℹ️ Exporter régulièrement la configuration Keycloak (realm export)
- ℹ️ Sauvegarder les logs de migration
- ℹ️ Monitorer les erreurs de synchronisation

---

## 🎯 Prochaines Étapes Recommandées

1. **Maintenant:** Configurer Keycloak manuellement (Phase 1)
2. **Ensuite:** Exécuter migration utilisateurs (Phase 2)
3. **Puis:** Tester tous les endpoints (Phase 3)
4. **Après:** Implémenter composant frontend (Phase 4)
5. **Enfin:** Déployer en production (Railway/Render)

---

**Date de dernière mise à jour:** 2024-01-XX
**Statut:** ✅ Backend complet - ⏳ Configuration manuelle requise
