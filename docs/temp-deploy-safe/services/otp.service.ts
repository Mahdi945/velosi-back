import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OtpData {
  code: string;
  email: string;
  expiresAt: number;
  purpose: 'password-reset' | 'email-verification';
  verified: boolean;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private otpStore = new Map<string, OtpData>();
  private readonly OTP_EXPIRY_MINUTES = 10;

  constructor(private configService: ConfigService) {
    // Nettoyer les OTP expirés toutes les 5 minutes
    setInterval(() => {
      this.cleanupExpiredOtps();
    }, 5 * 60 * 1000);
  }

  /**
   * Générer un nouveau code OTP
   */
  generateOtp(email: string, purpose: 'password-reset' | 'email-verification' = 'password-reset'): string {
    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const otpData: OtpData = {
      code,
      email: email.toLowerCase(),
      expiresAt: Date.now() + (this.OTP_EXPIRY_MINUTES * 60 * 1000),
      purpose,
      verified: false,
    };

    // Utiliser l'email comme clé pour permettre un seul OTP actif par email
    this.otpStore.set(email.toLowerCase(), otpData);
    
    this.logger.log(`OTP généré pour ${email} - Code: ${code} (expire dans ${this.OTP_EXPIRY_MINUTES} min)`);
    return code;
  }

  /**
   * Vérifier un code OTP
   */
  verifyOtp(email: string, code: string, purpose: 'password-reset' | 'email-verification' = 'password-reset'): boolean {
    const otpData = this.otpStore.get(email.toLowerCase());
    
    if (!otpData) {
      this.logger.warn(`Tentative de vérification OTP - Aucun OTP trouvé pour ${email}`);
      return false;
    }

    if (otpData.verified) {
      this.logger.warn(`Tentative de vérification OTP - OTP déjà utilisé pour ${email}`);
      return false;
    }

    if (otpData.purpose !== purpose) {
      this.logger.warn(`Tentative de vérification OTP - Mauvais type pour ${email}: ${otpData.purpose} vs ${purpose}`);
      return false;
    }

    if (Date.now() > otpData.expiresAt) {
      this.logger.warn(`Tentative de vérification OTP - Code expiré pour ${email}`);
      this.otpStore.delete(email.toLowerCase());
      return false;
    }

    if (otpData.code !== code) {
      this.logger.warn(`Tentative de vérification OTP - Code incorrect pour ${email}: ${code} vs ${otpData.code}`);
      return false;
    }

    // Marquer comme vérifié mais garder en mémoire pour le reset de mot de passe
    otpData.verified = true;
    this.logger.log(`OTP vérifié avec succès pour ${email}`);
    return true;
  }

  /**
   * Vérifier si un OTP a été vérifié récemment (pour le reset de mot de passe)
   */
  isOtpVerified(email: string, purpose: 'password-reset' | 'email-verification' = 'password-reset'): boolean {
    const otpData = this.otpStore.get(email.toLowerCase());
    
    if (!otpData) {
      return false;
    }

    return otpData.verified && 
           otpData.purpose === purpose && 
           Date.now() <= otpData.expiresAt;
  }

  /**
   * Invalider un OTP après utilisation
   */
  invalidateOtp(email: string): void {
    this.otpStore.delete(email.toLowerCase());
    this.logger.log(`OTP invalidé pour ${email}`);
  }

  /**
   * Nettoyer les OTP expirés
   */
  private cleanupExpiredOtps(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [email, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(email);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`${cleaned} OTP expirés nettoyés`);
    }
  }

  /**
   * Obtenir les statistiques OTP (pour debug)
   */
  getStats(): { total: number; expired: number; verified: number } {
    const now = Date.now();
    let expired = 0;
    let verified = 0;
    
    for (const otpData of this.otpStore.values()) {
      if (now > otpData.expiresAt) expired++;
      if (otpData.verified) verified++;
    }
    
    return {
      total: this.otpStore.size,
      expired,
      verified,
    };
  }
}