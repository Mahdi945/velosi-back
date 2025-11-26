import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

// Import des entités (à adapter selon votre structure)
// Nous utiliserons des types génériques pour gérer Personnel et Client

export interface BiometricUser {
  id: number;
  biometric_hash?: string;
  biometric_enabled?: boolean;
  biometric_registered_at?: Date;
  email?: string;
  nom_utilisateur?: string;
  nom?: string;
}

export interface RegisterBiometricDto {
  userId: number;
  userType: 'personnel' | 'client';
  biometricData: string; // Données biométriques du device (hash côté client)
}

export interface VerifyBiometricDto {
  userId: number;
  userType: 'personnel' | 'client';
  biometricData: string;
}

@Injectable()
export class BiometricService {
  constructor(
    // Les repositories seront injectés depuis le module d'authentification
  ) {}

  /**
   * Enregistrer une empreinte biométrique pour un utilisateur
   */
  async registerBiometric(
    userId: number,
    userType: 'personnel' | 'client',
    biometricData: string,
    personnelRepository?: Repository<any>,
    clientRepository?: Repository<any>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔐 Enregistrement biométrique pour ${userType} #${userId}`);

      // Valider les données biométriques
      if (!biometricData || biometricData.length < 32) {
        throw new BadRequestException('Données biométriques invalides');
      }

      // Générer un hash sécurisé des données biométriques
      // On combine avec un salt unique pour plus de sécurité
      const salt = await bcrypt.genSalt(12);
      const biometricHash = await bcrypt.hash(biometricData, salt);

      // Récupérer et mettre à jour l'utilisateur
      const repository = userType === 'personnel' ? personnelRepository : clientRepository;
      
      if (!repository) {
        throw new BadRequestException('Repository non disponible');
      }

      const user = await repository.findOne({ where: { id: userId } });
      
      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }

      // Mettre à jour les informations biométriques
      user.biometric_hash = biometricHash;
      user.biometric_enabled = true;
      user.biometric_registered_at = new Date();

      await repository.save(user);

      console.log(`✅ Empreinte biométrique enregistrée pour ${userType} #${userId}`);

      return {
        success: true,
        message: 'Empreinte biométrique enregistrée avec succès',
      };
    } catch (error) {
      console.error('❌ Erreur enregistrement biométrique:', error);
      throw new BadRequestException(
        `Erreur lors de l'enregistrement: ${error.message}`,
      );
    }
  }

  /**
   * Vérifier une empreinte biométrique
   */
  async verifyBiometric(
    userId: number,
    userType: 'personnel' | 'client',
    biometricData: string,
    personnelRepository?: Repository<any>,
    clientRepository?: Repository<any>,
  ): Promise<{ success: boolean; user?: any }> {
    try {
      console.log(`🔍 Vérification biométrique pour ${userType} #${userId}`);
      console.log(`📊 Hash reçu (longueur: ${biometricData?.length || 0})`);

      // Valider les données biométriques
      if (!biometricData || biometricData.length < 32) {
        console.log('❌ Données biométriques invalides (trop courtes)');
        throw new UnauthorizedException('Données biométriques invalides');
      }

      // Récupérer l'utilisateur
      const repository = userType === 'personnel' ? personnelRepository : clientRepository;
      
      if (!repository) {
        console.log('❌ Repository non disponible');
        throw new UnauthorizedException('Repository non disponible');
      }

      const user = await repository.findOne({ where: { id: userId } });
      
      if (!user) {
        console.log(`❌ Utilisateur ${userType} #${userId} non trouvé`);
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      // Vérifier si la biométrie est activée
      if (!user.biometric_enabled || !user.biometric_hash) {
        console.log(`❌ Biométrie non activée pour ${userType} #${userId}`);
        throw new UnauthorizedException('Authentification biométrique non configurée');
      }

      console.log(`🔐 Hash en BD (longueur: ${user.biometric_hash?.length || 0})`);
      console.log(`🔍 Comparaison avec bcrypt.compare()...`);

      // ✅ CORRECTION: Comparer le hash biométrique
      // bcrypt.compare() prend les données en clair et le hash
      const isValid = await bcrypt.compare(biometricData, user.biometric_hash);

      console.log(`📊 Résultat bcrypt.compare: ${isValid}`);

      if (!isValid) {
        console.log('❌ Empreinte biométrique invalide - Hash ne correspond pas');
        throw new UnauthorizedException('Empreinte biométrique invalide');
      }

      console.log(`✅ Empreinte biométrique valide pour ${userType} #${userId}`);

      return {
        success: true,
        user: {
          id: user.id,
          username: userType === 'personnel' ? user.nom_utilisateur : user.nom,
          email: user.email,
          userType,
          role: user.role || 'client',
          firstName: user.prenom || user.nom,
          lastName: user.nom || '',
        },
      };
    } catch (error) {
      console.error('❌ Erreur vérification biométrique:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException(
        `Erreur lors de la vérification: ${error.message}`,
      );
    }
  }

  /**
   * Désactiver l'authentification biométrique
   */
  async disableBiometric(
    userId: number,
    userType: 'personnel' | 'client',
    personnelRepository?: Repository<any>,
    clientRepository?: Repository<any>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔓 Désactivation biométrique pour ${userType} #${userId}`);

      const repository = userType === 'personnel' ? personnelRepository : clientRepository;
      
      if (!repository) {
        throw new BadRequestException('Repository non disponible');
      }

      const user = await repository.findOne({ where: { id: userId } });
      
      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }

      // Désactiver et supprimer le hash
      user.biometric_enabled = false;
      user.biometric_hash = null;
      user.biometric_registered_at = null;

      await repository.save(user);

      console.log(`✅ Biométrie désactivée pour ${userType} #${userId}`);

      return {
        success: true,
        message: 'Authentification biométrique désactivée',
      };
    } catch (error) {
      console.error('❌ Erreur désactivation biométrique:', error);
      throw new BadRequestException(
        `Erreur lors de la désactivation: ${error.message}`,
      );
    }
  }

  /**
   * Vérifier si l'utilisateur a configuré la biométrie
   */
  async isBiometricEnabled(
    userId: number,
    userType: 'personnel' | 'client',
    personnelRepository?: Repository<any>,
    clientRepository?: Repository<any>,
  ): Promise<{ enabled: boolean; registeredAt?: Date }> {
    try {
      const repository = userType === 'personnel' ? personnelRepository : clientRepository;
      
      if (!repository) {
        return { enabled: false };
      }

      const user = await repository.findOne({ where: { id: userId } });
      
      if (!user) {
        return { enabled: false };
      }

      return {
        enabled: user.biometric_enabled || false,
        registeredAt: user.biometric_registered_at,
      };
    } catch (error) {
      console.error('❌ Erreur vérification statut biométrique:', error);
      return { enabled: false };
    }
  }

  /**
   * Générer un challenge pour la vérification biométrique
   * (pour plus de sécurité, on peut générer un challenge unique)
   */
  generateBiometricChallenge(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
