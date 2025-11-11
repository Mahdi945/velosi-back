# 🔐 Guide Complet : Configuration Keycloak pour ERP Velosi

## 📋 Vue d'ensemble

Ce guide vous explique comment configurer Keycloak pour gérer l'authentification de votre ERP Velosi avec :
- ✅ **5 rôles Personnel** : commercial, administratif, chauffeur, exploitation, finance
- ✅ **1 rôle Client** : client
- ✅ **Synchronisation** avec tables PostgreSQL existantes (`personnel` et `client`)
- ✅ **Gestion des sessions** : contrôle, durée, fermeture forcée
- ✅ **Intégration** Backend NestJS + Frontend Angular

---

## 🚀 Étape 1 : Configuration Keycloak

### 1.1 Accéder à l'Admin Console

1. Ouvrez votre navigateur : **http://localhost:8080/admin**
2. Connectez-vous avec :
   - **Username** : `admin`
   - **Password** : `87Eq8384`

### 1.2 Créer le Realm `ERP_Velosi`

1. Cliquez sur le menu déroulant **"master"** en haut à gauche
2. Cliquez sur **"Create Realm"**
3. Remplissez :
   - **Realm name** : `ERP_Velosi`
   - **Enabled** : ☑️ Oui
4. Cliquez sur **"Create"**

### 1.3 Configurer les Sessions du Realm

1. Dans le Realm `ERP_Velosi`, allez dans **Realm Settings** → **Sessions**
2. Configurez :
   ```
   SSO Session Idle : 8 hours
   SSO Session Max : 10 hours
   SSO Session Idle Remember Me : 7 days
   SSO Session Max Remember Me : 30 days
   Client Session Idle : 8 hours
   Client Session Max : 10 hours
   ```
3. Cliquez sur **"Save"**

### 1.4 Créer le Client `velosi_auth`

1. Allez dans **Clients** → **Create client**
2. **General Settings** :
   - **Client type** : OpenID Connect
   - **Client ID** : `velosi_auth`
3. Cliquez sur **"Next"**
4. **Capability config** :
   - **Client authentication** : ☑️ ON
   - **Authorization** : ☑️ ON
   - **Authentication flow** :
     - ☑️ Standard flow
     - ☑️ Direct access grants
     - ☑️ Service accounts roles
5. Cliquez sur **"Next"**
6. **Login settings** :
   - **Root URL** : `http://localhost:4200`
   - **Home URL** : `http://localhost:4200`
   - **Valid redirect URIs** :
     ```
     http://localhost:4200/*
     http://localhost:3000/*
     ```
   - **Valid post logout redirect URIs** :
     ```
     http://localhost:4200/*
     ```
   - **Web origins** :
     ```
     http://localhost:4200
     http://localhost:3000
     +
     ```
7. Cliquez sur **"Save"**

### 1.5 Récupérer et Mettre à Jour le Client Secret

1. Dans **Clients** → `velosi_auth` → **Credentials**
2. **Client Secret** : `0SW8TshHXXdLEjpsBVCnQ4HvcSBbc2mN`
3. Cliquez sur **"Regenerate"** si vous voulez un nouveau secret
4. **Copiez** le secret affiché

---

## 👥 Étape 2 : Créer les Rôles

### 2.1 Créer les Rôles Realm

1. Allez dans **Realm roles** → **Create role**
2. Créez les rôles suivants UN PAR UN :

| Nom Rôle | Description |
|----------|-------------|
| `commercial` | Commercial - gestion prospects, devis, clients CRM |
| `administratif` | Administratif - gestion administrative et documentation |
| `chauffeur` | Chauffeur - suivi des livraisons et transport |
| `exploitation` | Exploitation - gestion des opérations et logistique |
| `finance` | Finance - gestion financière, comptabilité et facturation |
| `client` | Client - accès portail client limité |

Pour chaque rôle :
- **Role name** : (nom du rôle)
- **Description** : (description ci-dessus)
- Cliquez sur **"Save"**

### 2.2 Créer un Groupe pour chaque Rôle (Optionnel mais recommandé)

1. Allez dans **Groups** → **Create group**
2. Créez les groupes : `Commerciaux`, `Administratifs`, `Chauffeurs`, `Exploitation`, `Finance`, `Clients`
3. Pour chaque groupe :
   - Allez dans **Role mapping**
   - Cliquez sur **"Assign role"**
   - Sélectionnez le rôle correspondant

---

## 🔄 Étape 3 : Synchronisation avec PostgreSQL

### 3.1 Architecture de Synchronisation

```
┌─────────────────┐         ┌──────────────┐         ┌──────────────┐
│  Table          │         │   NestJS     │         │  Keycloak    │
│  personnel      │ ◄─────► │   Backend    │ ◄─────► │   Realm      │
│  (5 rôles)      │         │  Auth Service│         │  ERP_Velosi  │
└─────────────────┘         └──────────────┘         └──────────────┘
                                    ▲
┌─────────────────┐                 │
│  Table          │                 │
│  client         │ ◄───────────────┘
│  (1 rôle)       │
└─────────────────┘
```

### 3.2 Logique de Synchronisation

**À la création d'un utilisateur (Personnel ou Client)** :
1. ✅ Créer l'entrée dans PostgreSQL (table `personnel` ou `client`)
2. ✅ Créer l'utilisateur dans Keycloak via API
3. ✅ Assigner le rôle approprié dans Keycloak
4. ✅ Stocker le `keycloak_id` (UUID) dans PostgreSQL

**Au login** :
1. ✅ Authentification via Keycloak (username/password)
2. ✅ Récupérer le `keycloak_id` du token
3. ✅ Charger les données complètes depuis PostgreSQL
4. ✅ Créer la session dans Keycloak

**À la modification d'un utilisateur** :
1. ✅ Mettre à jour PostgreSQL
2. ✅ Synchroniser avec Keycloak (email, nom, rôle, statut)

**À la désactivation/suppression** :
1. ✅ Marquer comme `statut='inactif'` dans PostgreSQL
2. ✅ Désactiver l'utilisateur dans Keycloak
3. ✅ Fermer toutes les sessions actives

---

## 🔌 Étape 4 : Configuration Backend NestJS

### 4.1 Mettre à jour `.env`

```properties
# Configuration Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=0SW8TshHXXdLEjpsBVCnQ4HvcSBbc2mN

# Configuration Keycloak Admin (pour la synchronisation)
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
```

### 4.2 Service de Synchronisation Keycloak

Créer `src/auth/keycloak-sync.service.ts` :

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class KeycloakSyncService {
  private readonly logger = new Logger(KeycloakSyncService.name);
  private adminToken: string;
  private tokenExpiry: number;

  constructor(private configService: ConfigService) {}

  private async getAdminToken(): Promise<string> {
    // Si le token est encore valide, on le réutilise
    if (this.adminToken && Date.now() < this.tokenExpiry) {
      return this.adminToken;
    }

    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const adminUsername = this.configService.get('KEYCLOAK_ADMIN_USERNAME');
    const adminPassword = this.configService.get('KEYCLOAK_ADMIN_PASSWORD');

    try {
      const response = await axios.post(
        `${keycloakUrl}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: adminUsername,
          password: adminPassword,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      this.adminToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.adminToken;
    } catch (error) {
      this.logger.error('Erreur obtention token admin Keycloak', error.message);
      throw new Error('Impossible d\'obtenir le token admin Keycloak');
    }
  }

  /**
   * Créer un utilisateur dans Keycloak
   */
  async createUser(userData: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: string;
    enabled?: boolean;
  }): Promise<string> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const realm = this.configService.get('KEYCLOAK_REALM');

    try {
      // 1. Créer l'utilisateur
      const createResponse = await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          enabled: userData.enabled !== false,
          emailVerified: true,
          credentials: [
            {
              type: 'password',
              value: userData.password,
              temporary: false,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // 2. Récupérer l'ID de l'utilisateur créé
      const locationHeader = createResponse.headers['location'];
      const userId = locationHeader.split('/').pop();

      // 3. Assigner le rôle
      await this.assignRole(userId, userData.role);

      this.logger.log(`Utilisateur Keycloak créé: ${userData.username} (${userId})`);
      return userId;
    } catch (error) {
      this.logger.error('Erreur création utilisateur Keycloak', error.response?.data || error.message);
      throw new Error(`Impossible de créer l'utilisateur dans Keycloak: ${error.message}`);
    }
  }

  /**
   * Assigner un rôle à un utilisateur
   */
  async assignRole(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const realm = this.configService.get('KEYCLOAK_REALM');

    try {
      // 1. Récupérer le rôle par son nom
      const roleResponse = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/roles/${roleName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const role = roleResponse.data;

      // 2. Assigner le rôle à l'utilisateur
      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
        [role],
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Rôle ${roleName} assigné à l'utilisateur ${userId}`);
    } catch (error) {
      this.logger.error('Erreur assignation rôle Keycloak', error.response?.data || error.message);
      throw new Error(`Impossible d'assigner le rôle ${roleName}: ${error.message}`);
    }
  }

  /**
   * Mettre à jour un utilisateur Keycloak
   */
  async updateUser(
    keycloakId: string,
    updates: {
      email?: string;
      firstName?: string;
      lastName?: string;
      enabled?: boolean;
    },
  ): Promise<void> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const realm = this.configService.get('KEYCLOAK_REALM');

    try {
      await axios.put(
        `${keycloakUrl}/admin/realms/${realm}/users/${keycloakId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Utilisateur Keycloak mis à jour: ${keycloakId}`);
    } catch (error) {
      this.logger.error('Erreur mise à jour utilisateur Keycloak', error.response?.data || error.message);
      throw new Error(`Impossible de mettre à jour l'utilisateur Keycloak: ${error.message}`);
    }
  }

  /**
   * Désactiver un utilisateur Keycloak
   */
  async disableUser(keycloakId: string): Promise<void> {
    await this.updateUser(keycloakId, { enabled: false });
  }

  /**
   * Activer un utilisateur Keycloak
   */
  async enableUser(keycloakId: string): Promise<void> {
    await this.updateUser(keycloakId, { enabled: true });
  }

  /**
   * Fermer toutes les sessions d'un utilisateur
   */
  async logoutUser(keycloakId: string): Promise<void> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const realm = this.configService.get('KEYCLOAK_REALM');

    try {
      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users/${keycloakId}/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      this.logger.log(`Sessions fermées pour l'utilisateur ${keycloakId}`);
    } catch (error) {
      this.logger.error('Erreur fermeture sessions Keycloak', error.response?.data || error.message);
      throw new Error(`Impossible de fermer les sessions: ${error.message}`);
    }
  }

  /**
   * Récupérer les sessions actives d'un utilisateur
   */
  async getUserSessions(keycloakId: string): Promise<any[]> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const realm = this.configService.get('KEYCLOAK_REALM');

    try {
      const response = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/users/${keycloakId}/sessions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Erreur récupération sessions Keycloak', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Réinitialiser le mot de passe d'un utilisateur
   */
  async resetPassword(keycloakId: string, newPassword: string, temporary: boolean = false): Promise<void> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const realm = this.configService.get('KEYCLOAK_REALM');

    try {
      await axios.put(
        `${keycloakUrl}/admin/realms/${realm}/users/${keycloakId}/reset-password`,
        {
          type: 'password',
          value: newPassword,
          temporary,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Mot de passe réinitialisé pour l'utilisateur ${keycloakId}`);
    } catch (error) {
      this.logger.error('Erreur réinitialisation mot de passe Keycloak', error.response?.data || error.message);
      throw new Error(`Impossible de réinitialiser le mot de passe: ${error.message}`);
    }
  }
}
```

---

## 🎯 Étape 5 : Gestion des Sessions

### 5.1 Endpoint Backend pour Contrôle des Sessions

Ajouter dans `src/auth/auth.controller.ts` :

```typescript
@Get('sessions/:personnelId')
@UseGuards(JwtAuthGuard)
async getUserSessions(@Param('personnelId') personnelId: number) {
  return this.authService.getPersonnelSessions(personnelId);
}

@Delete('sessions/:personnelId')
@UseGuards(JwtAuthGuard)
async closeUserSessions(@Param('personnelId') personnelId: number) {
  return this.authService.closePersonnelSessions(personnelId);
}

@Delete('sessions/:personnelId/:sessionId')
@UseGuards(JwtAuthGuard)
async closeSpecificSession(
  @Param('personnelId') personnelId: number,
  @Param('sessionId') sessionId: string,
) {
  return this.authService.closeSpecificSession(personnelId, sessionId);
}
```

Ajouter dans `src/auth/auth.service.ts` :

```typescript
async getPersonnelSessions(personnelId: number) {
  const personnel = await this.personnelRepository.findOne({
    where: { id: personnelId },
  });

  if (!personnel || !personnel.keycloak_id) {
    throw new NotFoundException('Personnel non trouvé');
  }

  const sessions = await this.keycloakSyncService.getUserSessions(personnel.keycloak_id);

  return sessions.map(session => ({
    id: session.id,
    ipAddress: session.ipAddress,
    start: new Date(session.start),
    lastAccess: new Date(session.lastAccess),
    duration: Math.floor((Date.now() - session.start) / 1000), // en secondes
  }));
}

async closePersonnelSessions(personnelId: number) {
  const personnel = await this.personnelRepository.findOne({
    where: { id: personnelId },
  });

  if (!personnel || !personnel.keycloak_id) {
    throw new NotFoundException('Personnel non trouvé');
  }

  await this.keycloakSyncService.logoutUser(personnel.keycloak_id);

  return { message: 'Toutes les sessions ont été fermées' };
}
```

### 5.2 Page Frontend - Contrôle des Sessions

Créer `src/app/personnel/personnel-sessions/personnel-sessions.component.ts` :

```typescript
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-personnel-sessions',
  template: `
    <div class="sessions-container">
      <h2>Sessions Actives - {{ personnelName }}</h2>
      
      <div class="sessions-list">
        <div *ngFor="let session of sessions" class="session-card">
          <div class="session-info">
            <p><strong>IP:</strong> {{ session.ipAddress }}</p>
            <p><strong>Début:</strong> {{ session.start | date:'medium' }}</p>
            <p><strong>Dernier accès:</strong> {{ session.lastAccess | date:'medium' }}</p>
            <p><strong>Durée:</strong> {{ formatDuration(session.duration) }}</p>
          </div>
          <button (click)="closeSession(session.id)" class="btn-close">
            Fermer cette session
          </button>
        </div>
      </div>

      <button (click)="closeAllSessions()" class="btn-close-all">
        Fermer toutes les sessions
      </button>
    </div>
  `,
  styles: [`
    .sessions-container {
      padding: 20px;
    }
    .session-card {
      border: 1px solid #ddd;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-close {
      background: #dc3545;
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-close-all {
      background: #ff6b6b;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 20px;
    }
  `]
})
export class PersonnelSessionsComponent implements OnInit {
  personnelId: number;
  personnelName: string;
  sessions: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.personnelId = +this.route.snapshot.params['id'];
    this.loadSessions();
  }

  loadSessions() {
    this.authService.getUserSessions(this.personnelId).subscribe({
      next: (data) => {
        this.sessions = data;
      },
      error: (err) => console.error(err)
    });
  }

  closeSession(sessionId: string) {
    this.authService.closeSpecificSession(this.personnelId, sessionId).subscribe({
      next: () => {
        this.loadSessions();
        alert('Session fermée avec succès');
      },
      error: (err) => console.error(err)
    });
  }

  closeAllSessions() {
    if (confirm('Voulez-vous vraiment fermer toutes les sessions ?')) {
      this.authService.closeAllSessions(this.personnelId).subscribe({
        next: () => {
          this.loadSessions();
          alert('Toutes les sessions ont été fermées');
        },
        error: (err) => console.error(err)
      });
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
```

---

## ✅ Checklist Finale

### Configuration Keycloak
- [ ] Realm `ERP_Velosi` créé
- [ ] Client `velosi_auth` configuré avec nouveau secret `0SW8TshHXXdLEjpsBVCnQ4HvcSBbc2mN`
- [ ] 6 rôles créés (commercial, administratif, chauffeur, exploitation, finance, client)
- [ ] Sessions configurées (8h idle, 10h max)

### Backend
- [ ] `.env` mis à jour avec nouveau secret
- [ ] `KeycloakSyncService` créé
- [ ] Endpoints de gestion de session ajoutés
- [ ] Service de synchronisation intégré dans `AuthService`

### Frontend
- [ ] Composant de contrôle de sessions créé
- [ ] Route ajoutée pour `/personnel/:id/sessions`
- [ ] Onglet "Sessions" ajouté dans la page personnel

### Tests
- [ ] Créer un utilisateur personnel et vérifier sync Keycloak
- [ ] Se connecter et vérifier la session dans Keycloak
- [ ] Tester la fermeture de session depuis l'interface
- [ ] Vérifier l'expiration automatique après 8h

---

## 🎓 Prochaines Étapes

1. **Importer les utilisateurs existants** : Script de migration personnel/client → Keycloak
2. **Déploiement Railway** : Keycloak en ligne avec PostgreSQL (Supabase)
3. **Export du Realm** : Sauvegarde de la configuration pour déploiement

**Keycloak est maintenant opérationnel sur** : http://localhost:8080 🎉
