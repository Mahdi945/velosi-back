import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KeycloakUser {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
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

  // Authentifier un utilisateur avec username/password via Keycloak
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async authenticateUser(username: string, password: string): Promise<any> {
    // Grant type 'password' désactivé car il cause des erreurs 401
    // L'authentification se fait maintenant uniquement via le backend
    this.logger.debug(
      `Authentification Keycloak désactivée pour ${username} - utilisation du backend uniquement`,
    );
    return null;
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
        }),
      });

      if (response.ok) {
        // Récupérer l'ID de l'utilisateur créé depuis l'en-tête Location
        const location = response.headers.get('Location');
        if (location) {
          const userId = location.substring(location.lastIndexOf('/') + 1);
          this.logger.debug(`Utilisateur Keycloak créé avec succès: ${userId}`);
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
}
