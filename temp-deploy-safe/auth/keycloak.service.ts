import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KeycloakUser {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  password?: string;
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private readonly keycloakBaseUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string;
  private tokenExpiry: number;

  constructor(private configService: ConfigService) {
    this.keycloakBaseUrl =
      this.configService.get('KEYCLOAK_URL') || 'http://localhost:8080';
    this.realm = this.configService.get('KEYCLOAK_REALM') || 'ERP_Velosi';
    this.clientId =
      this.configService.get('KEYCLOAK_CLIENT_ID') || 'velosi_auth';
    this.clientSecret =
      this.configService.get('KEYCLOAK_CLIENT_SECRET') ||
      'SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF';

    this.logger.debug(
      `Configuration Keycloak: URL=${this.keycloakBaseUrl}, Realm=${this.realm}, Client=${this.clientId}`,
    );
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Utiliser le client secret pour obtenir un token d'accès
      const tokenUrl = `${this.keycloakBaseUrl}/realms/${this.realm}/protocol/openid-connect/token`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Échec authentification Keycloak avec client secret: ${response.status} ${response.statusText} - ${errorText}`,
        );
        throw new Error(
          `Erreur d'authentification Keycloak: ${response.status}`,
        );
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 10000; // 10s de marge

      this.logger.debug("Token d'accès Keycloak obtenu avec succès");
      return this.accessToken;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'obtention du token Keycloak: ${error.message}`,
      );
      throw error;
    }
  }

  // Vérifier si Keycloak est disponible
  async checkConnection(): Promise<boolean> {
    try {
      const wellKnownUrl = `${this.keycloakBaseUrl}/realms/${this.realm}/.well-known/openid_connect_configuration`;
      const response = await fetch(wellKnownUrl);

      if (response.ok) {
        this.logger.debug('Connexion Keycloak vérifiée avec succès');
        return true;
      } else {
        this.logger.warn(`Keycloak non accessible: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logger.warn(
        `Impossible de se connecter à Keycloak: ${error.message}`,
      );
      return false;
    }
  }

  // Valider un token JWT Keycloak
  async validateToken(token: string): Promise<any> {
    try {
      const userInfoUrl = `${this.keycloakBaseUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;

      const response = await fetch(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.logger.warn(`Token invalide: ${response.status}`);
        return null;
      }

      const userInfo = await response.json();
      this.logger.debug(
        `Token validé pour l'utilisateur: ${userInfo.preferred_username}`,
      );
      return userInfo;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la validation du token: ${error.message}`,
      );
      return null;
    }
  }

  // Obtenir les informations d'un utilisateur par son token
  async getUserInfo(token: string): Promise<any> {
    return this.validateToken(token);
  }

  // Vérifier si un utilisateur existe dans Keycloak (nécessite des privilèges admin sur le client)
  async userExists(username: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const usersUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users?username=${encodeURIComponent(username)}`;

      const response = await fetch(usersUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const users = await response.json();
        return users.length > 0;
      } else {
        this.logger.warn(
          `Impossible de vérifier l'existence de l'utilisateur: ${response.status}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.warn(
        `Erreur lors de la vérification de l'utilisateur: ${error.message}`,
      );
      return false;
    }
  }

  // Enregistrer une activité de connexion dans Keycloak
  async recordUserActivity(keycloakId: string, activityType: 'login' | 'logout' = 'login'): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      // D'abord, récupérer les attributs existants de l'utilisateur
      const userUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}`;
      const getUserResponse = await fetch(userUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      let existingAttributes: any = {};
      let totalSessions = 1;

      if (getUserResponse.ok) {
        const userData = await getUserResponse.json();
        existingAttributes = userData.attributes || {};
        
        // Incrémenter le compteur de sessions pour les connexions
        if (activityType === 'login' && existingAttributes.totalSessions) {
          totalSessions = parseInt(existingAttributes.totalSessions[0], 10) + 1;
        }
      }
      
      // Mettre à jour les attributs utilisateur pour enregistrer l'activité
      const currentTime = new Date().toISOString();
      const updateData = {
        attributes: {
          ...existingAttributes,
          lastActivity: [currentTime],
          lastActivityType: [activityType],
          lastLoginTime: activityType === 'login' ? [currentTime] : existingAttributes.lastLoginTime,
          totalSessions: activityType === 'login' ? [totalSessions.toString()] : existingAttributes.totalSessions
        }
      };

      const response = await fetch(userUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        this.logger.log(`Activité ${activityType} enregistrée pour utilisateur Keycloak: ${keycloakId} (sessions: ${totalSessions})`);
        return true;
      } else {
        const errorData = await response.text();
        this.logger.warn(`Erreur enregistrement activité ${activityType}: ${errorData}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur enregistrement activité ${activityType}:`, error.message);
      return false;
    }
  }

  // Créer une session utilisateur simulée dans Keycloak
  async createUserSession(keycloakId: string, userAgent?: string, ipAddress?: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      // Enregistrer les détails de session comme attributs utilisateur
      const userUpdateUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}`;
      
      const sessionData = {
        attributes: {
          currentSessionStart: [new Date().toISOString()],
          sessionUserAgent: userAgent ? [userAgent] : undefined,
          sessionIpAddress: ipAddress ? [ipAddress] : undefined,
          sessionActive: ['true']
        }
      };

      const response = await fetch(userUpdateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        this.logger.log(`Session créée pour utilisateur Keycloak: ${keycloakId}`);
        return true;
      } else {
        const errorData = await response.text();
        this.logger.warn(`Erreur création session: ${errorData}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur création session:`, error.message);
      return false;
    }
  }

  // Rafraîchir un token
  async refreshToken(refreshToken: string): Promise<any> {
    try {
      const tokenUrl = `${this.keycloakBaseUrl}/realms/${this.realm}/protocol/openid-connect/token`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        this.logger.warn(
          `Échec du rafraîchissement du token: ${response.status}`,
        );
        return null;
      }

      const tokenData = await response.json();
      this.logger.debug('Token rafraîchi avec succès');
      return tokenData;
    } catch (error) {
      this.logger.error(
        `Erreur lors du rafraîchissement du token: ${error.message}`,
      );
      return null;
    }
  }

  // Déconnecter un utilisateur (logout)
  async logout(refreshToken: string): Promise<boolean> {
    try {
      const logoutUrl = `${this.keycloakBaseUrl}/realms/${this.realm}/protocol/openid-connect/logout`;

      const response = await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }).toString(),
      });

      if (response.ok) {
        this.logger.debug('Déconnexion réussie');
        return true;
      } else {
        this.logger.warn(`Échec de la déconnexion: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la déconnexion: ${error.message}`);
      return false;
    }
  }

  // Créer un utilisateur dans Keycloak
  async createUser(userData: KeycloakUser): Promise<string | null> {
    try {
      // Validation de l'email
      if (!this.isValidEmail(userData.email)) {
        this.logger.warn(
          `Email invalide pour l'utilisateur ${userData.username}: ${userData.email}`,
        );
        throw new Error(`Email invalide: ${userData.email}`);
      }

      const accessToken = await this.getAccessToken();
      const usersUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users`;

      const response = await fetch(usersUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          enabled: userData.enabled,
          emailVerified: true,
          credentials: userData.password ? [{
            type: 'password',
            value: userData.password,
            temporary: false
          }] : undefined,
        }),
      });

      if (response.ok) {
        // Récupérer l'ID de l'utilisateur créé depuis l'en-tête Location
        const location = response.headers.get('Location');
        if (location) {
          const userId = location.substring(location.lastIndexOf('/') + 1);
          this.logger.debug(`Utilisateur Keycloak créé avec succès: ${userId}`);
          
          // Initialiser les attributs d'activité pour le nouvel utilisateur
          await this.initializeUserActivity(userId);
          
          return userId;
        }
      } else {
        const errorText = await response.text();
        this.logger.warn(
          `Échec de la création de l'utilisateur: ${response.status} - ${errorText}`,
        );
        
        // Tenter de parser l'erreur JSON pour plus de détails
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.errorMessage) {
            throw new Error(`Keycloak error: ${errorData.errorMessage}`);
          }
        } catch (parseError) {
          // Ignorer l'erreur de parsing et utiliser le texte brut
        }
        
        throw new Error(`Échec création utilisateur Keycloak: ${response.status}`);
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création de l'utilisateur Keycloak: ${error.message}`,
      );
      throw error; // Propager l'erreur au lieu de retourner null
    }
  }

  // Validation de l'email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Obtenir un utilisateur par email depuis Keycloak
   */
  async getUserByEmail(email: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const usersUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users?email=${encodeURIComponent(email)}`;

      const response = await fetch(usersUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const users = await response.json();
        if (users.length > 0) {
          this.logger.debug(`Utilisateur trouvé dans Keycloak pour ${email}`);
          return users[0];
        }
      } else {
        this.logger.warn(`Impossible de rechercher l'utilisateur par email: ${response.status}`);
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`Erreur lors de la recherche utilisateur par email: ${error.message}`);
      return null;
    }
  }

  /**
   * Réinitialiser le mot de passe d'un utilisateur dans Keycloak
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const passwordUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${userId}/reset-password`;

      const response = await fetch(passwordUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'password',
          value: newPassword,
          temporary: false, // Mot de passe permanent
        }),
      });

      if (response.ok) {
        this.logger.log(`Mot de passe réinitialisé avec succès dans Keycloak pour l'utilisateur ${userId}`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.warn(`Échec de la réinitialisation du mot de passe: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la réinitialisation du mot de passe: ${error.message}`);
      return false;
    }
  }

  /**
   * Déclencher un email de récupération de mot de passe via Keycloak
   */
  async sendPasswordResetEmail(userId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const resetUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${userId}/execute-actions-email`;

      const response = await fetch(resetUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['UPDATE_PASSWORD']),
      });

      if (response.ok) {
        this.logger.log(`Email de récupération envoyé via Keycloak pour l'utilisateur ${userId}`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.warn(`Échec envoi email récupération: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur envoi email récupération: ${error.message}`);
      return false;
    }
  }

  // Assigner un rôle à un utilisateur dans Keycloak
  async assignRoleToUser(userId: string, roleName: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      // D'abord, récupérer les informations du rôle
      const rolesUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/roles/${roleName}`;
      const roleResponse = await fetch(rolesUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!roleResponse.ok) {
        this.logger.warn(`Rôle ${roleName} non trouvé dans Keycloak`);
        return false;
      }

      const roleData = await roleResponse.json();

      // Assigner le rôle à l'utilisateur
      const assignRoleUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`;
      const assignResponse = await fetch(assignRoleUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([roleData]),
      });

      if (assignResponse.ok) {
        this.logger.log(`Rôle ${roleName} assigné avec succès à l'utilisateur ${userId}`);
        return true;
      } else {
        const errorText = await assignResponse.text();
        this.logger.warn(`Échec de l'assignation du rôle: ${assignResponse.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'assignation du rôle: ${error.message}`);
      return false;
    }
  }

  // Mettre à jour un utilisateur dans Keycloak
  async updateUser(keycloakId: string, userData: Partial<KeycloakUser>): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const userUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}`;

      const updateData: any = {};
      if (userData.username) updateData.username = userData.username;
      if (userData.email) updateData.email = userData.email;
      if (userData.firstName) updateData.firstName = userData.firstName;
      if (userData.lastName) updateData.lastName = userData.lastName;
      if (userData.enabled !== undefined) updateData.enabled = userData.enabled;

      const response = await fetch(userUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        this.logger.log(`Utilisateur Keycloak ${keycloakId} mis à jour avec succès`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.warn(`Échec de la mise à jour de l'utilisateur: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de l'utilisateur: ${error.message}`);
      return false;
    }
  }

  // Mettre à jour le mot de passe d'un utilisateur dans Keycloak
  async updateUserPassword(keycloakId: string, newPassword: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const passwordUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}/reset-password`;

      const response = await fetch(passwordUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'password',
          value: newPassword,
          temporary: false,
        }),
      });

      if (response.ok) {
        this.logger.log(`Mot de passe mis à jour avec succès pour l'utilisateur ${keycloakId}`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.warn(`Échec de la mise à jour du mot de passe: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour du mot de passe: ${error.message}`);
      return false;
    }
  }

  // Activer/Désactiver un utilisateur dans Keycloak
  async enableUser(keycloakId: string): Promise<boolean> {
    return await this.updateUserStatus(keycloakId, true);
  }

  async disableUser(keycloakId: string): Promise<boolean> {
    return await this.updateUserStatus(keycloakId, false);
  }

  private async updateUserStatus(keycloakId: string, enabled: boolean): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const userUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}`;

      const response = await fetch(userUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: enabled,
        }),
      });

      if (response.ok) {
        this.logger.log(`Utilisateur ${keycloakId} ${enabled ? 'activé' : 'désactivé'} dans Keycloak`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.warn(`Échec de la mise à jour du statut: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour du statut: ${error.message}`);
      return false;
    }
  }

  // Supprimer tous les rôles d'un utilisateur puis assigner un nouveau rôle
  async updateUserRole(keycloakId: string, newRole: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      // 1. Récupérer les rôles actuels de l'utilisateur
      const userRolesUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}/role-mappings/realm`;
      const userRolesResponse = await fetch(userRolesUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (userRolesResponse.ok) {
        const currentRoles = await userRolesResponse.json();
        
        // 2. Supprimer tous les rôles actuels
        if (currentRoles.length > 0) {
          const removeResponse = await fetch(userRolesUrl, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentRoles),
          });

          if (!removeResponse.ok) {
            this.logger.warn(`Échec de la suppression des anciens rôles`);
          }
        }

        // 3. Assigner le nouveau rôle
        return await this.assignRoleToUser(keycloakId, newRole);
      } else {
        this.logger.warn(`Impossible de récupérer les rôles actuels de l'utilisateur`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour du rôle: ${error.message}`);
      return false;
    }
  }

  // Supprimer un utilisateur de Keycloak
  async deleteUser(keycloakId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const userUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}`;

      const response = await fetch(userUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        this.logger.log(`Utilisateur ${keycloakId} supprimé de Keycloak`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.warn(`Échec de la suppression de l'utilisateur: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
      return false;
    }
  }

  // Obtenir les sessions actives d'un utilisateur
  async getUserSessions(keycloakId: string): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken();
      const sessionsUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}/sessions`;

      const response = await fetch(sessionsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const sessions = await response.json();
        this.logger.debug(`${sessions.length} sessions trouvées pour l'utilisateur ${keycloakId}`);
        return sessions;
      } else {
        this.logger.warn(`Impossible de récupérer les sessions: ${response.status}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des sessions: ${error.message}`);
      return [];
    }
  }

  // Obtenir les informations d'activité d'un utilisateur
  async getUserActivity(keycloakId: string): Promise<{
    lastLoginDate: Date | null;
    totalSessions: number;
    activeSessions: number;
    accountCreated: Date | null;
  }> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Récupérer les informations de l'utilisateur avec ses attributs
      const userUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}`;
      const userResponse = await fetch(userUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      let accountCreated: Date | null = null;
      let lastLoginFromAttributes: Date | null = null;
      let totalSessionsFromAttributes = 0;

      if (userResponse.ok) {
        const userData = await userResponse.json();
        accountCreated = userData.createdTimestamp ? new Date(userData.createdTimestamp) : null;
        
        // Récupérer les informations d'activité depuis les attributs utilisateur
        if (userData.attributes) {
          if (userData.attributes.lastLoginTime && userData.attributes.lastLoginTime[0]) {
            lastLoginFromAttributes = new Date(userData.attributes.lastLoginTime[0]);
          }
          if (userData.attributes.totalSessions && userData.attributes.totalSessions[0]) {
            totalSessionsFromAttributes = parseInt(userData.attributes.totalSessions[0], 10) || 0;
          }
        }
      }

      // Récupérer les sessions actives
      const sessions = await this.getUserSessions(keycloakId);
      const activeSessions = sessions.length;

      // Calculer la dernière connexion - utiliser les attributs ou les sessions
      let lastLoginDate: Date | null = lastLoginFromAttributes;
      if (!lastLoginDate && sessions.length > 0) {
        const timestamps = sessions
          .map(session => session.lastAccess || session.start)
          .filter(timestamp => timestamp)
          .map(timestamp => new Date(timestamp));
        
        if (timestamps.length > 0) {
          lastLoginDate = new Date(Math.max(...timestamps.map(d => d.getTime())));
        }
      }

      // Utiliser le compteur des attributs ou le nombre de sessions actives
      const totalSessions = Math.max(totalSessionsFromAttributes, activeSessions);

      return {
        lastLoginDate,
        totalSessions,
        activeSessions,
        accountCreated,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'activité utilisateur: ${error.message}`);
      return {
        lastLoginDate: null,
        totalSessions: 0,
        activeSessions: 0,
        accountCreated: null,
      };
    }
  }

  // Déconnecter toutes les sessions d'un utilisateur
  async logoutAllUserSessions(keycloakId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const logoutUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}/logout`;

      const response = await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        this.logger.log(`Toutes les sessions de l'utilisateur ${keycloakId} ont été fermées`);
        return true;
      } else {
        this.logger.warn(`Échec de la fermeture des sessions: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la fermeture des sessions: ${error.message}`);
      return false;
    }
  }

  // Obtenir les statistiques d'utilisation du realm
  async getRealmStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
  }> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Récupérer le nombre total d'utilisateurs
      const usersUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/count`;
      const usersResponse = await fetch(usersUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      let totalUsers = 0;
      if (usersResponse.ok) {
        totalUsers = await usersResponse.json();
      }

      // Récupérer les statistiques des sessions
      const sessionsUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/client-session-stats`;
      const sessionsResponse = await fetch(sessionsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      let totalSessions = 0;
      let activeUsers = 0;
      if (sessionsResponse.ok) {
        const sessionStats = await sessionsResponse.json();
        totalSessions = sessionStats.reduce((sum, stat) => sum + (stat.active || 0), 0);
        activeUsers = sessionStats.length;
      }

      return {
        totalUsers,
        activeUsers,
        totalSessions,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des statistiques du realm: ${error.message}`);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalSessions: 0,
      };
    }
  }

  // Initialiser les attributs d'activité d'un utilisateur
  private async initializeUserActivity(keycloakId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const userUpdateUrl = `${this.keycloakBaseUrl}/admin/realms/${this.realm}/users/${keycloakId}`;
      
      const currentTime = new Date().toISOString();
      const initData = {
        attributes: {
          totalSessions: ['0'],
          accountCreated: [currentTime],
          lastActivity: [currentTime],
          lastActivityType: ['created'],
          sessionActive: ['false']
        }
      };

      const response = await fetch(userUpdateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(initData),
      });

      if (response.ok) {
        this.logger.log(`Attributs d'activité initialisés pour l'utilisateur Keycloak: ${keycloakId}`);
      } else {
        const errorData = await response.text();
        this.logger.warn(`Erreur initialisation attributs activité: ${errorData}`);
      }
    } catch (error) {
      this.logger.error(`Erreur initialisation attributs activité:`, error.message);
    }
  }


}
