import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'usernameOrEmail', // Accepter le champ usernameOrEmail
      passwordField: 'password',
    });
  }

  async validate(usernameOrEmail: string, password: string): Promise<any> {
    // La méthode validateUser lance déjà des UnauthorizedException spécifiques
    // pour les utilisateurs suspendus/désactivés, on les laisse passer
    try {
      const user = await this.authService.validateUser(usernameOrEmail, password);
      
      // Si validateUser retourne null/undefined (cas générique - mauvais identifiants)
      if (!user) {
        throw new UnauthorizedException('Identifiants invalides');
      }
      
      return user;
    } catch (error) {
      // Si c'est déjà une UnauthorizedException avec un message spécifique
      // (suspension, désactivation, etc.), on la laisse passer
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Pour toute autre erreur, on lance le message générique
      throw new UnauthorizedException('Identifiants invalides');
    }
  }
}
