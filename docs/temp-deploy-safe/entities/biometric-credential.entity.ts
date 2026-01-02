import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Personnel } from './personnel.entity';
import { Client } from './client.entity';

/**
 * Enum pour le type d'utilisateur
 */
export enum UserType {
  PERSONNEL = 'personnel',
  CLIENT = 'client',
}

/**
 * 🔐 Entity BiometricCredential
 * Gère les credentials WebAuthn multi-appareils avec support Resident Keys
 * 
 * ARCHITECTURE:
 * - Un utilisateur (Personnel ou Client) peut avoir PLUSIEURS credentials (multi-appareils)
 * - Chaque credential représente un appareil/navigateur unique
 * - Support Resident Keys pour connexion sans username
 * 
 * SÉCURITÉ:
 * - Clé publique stockée (jamais de données biométriques)
 * - Compteur anti-replay pour détecter les credentials clonés
 * - Validation stricte de la signature WebAuthn
 */
@Entity('biometric_credentials')
export class BiometricCredential {
  @PrimaryGeneratedColumn()
  id: number;

  // ================================================================
  // RELATIONS UTILISATEUR (Personnel OU Client)
  // ================================================================

  @Column({ type: 'int', nullable: true })
  personnel_id: number | null;

  @Column({ type: 'int', nullable: true })
  client_id: number | null;

  @Column({
    type: 'enum',
    enum: UserType,
    nullable: false,
  })
  user_type: UserType;

  @ManyToOne(() => Personnel, (personnel) => personnel.biometricCredentials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'personnel_id' })
  personnel: Personnel | null;

  @ManyToOne(() => Client, (client) => client.biometricCredentials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  // ================================================================
  // CREDENTIAL WEBAUTHN
  // ================================================================

  @Column({ type: 'text', unique: true, nullable: false })
  credential_id: string; // Base64URL du credential ID (unique par appareil)

  @Column({ type: 'text', nullable: false })
  public_key: string; // Clé publique au format JWK ou PEM

  @Column({ type: 'bigint', default: 0, nullable: false })
  counter: number; // Compteur anti-replay (incrémenté à chaque utilisation)

  // ================================================================
  // INFORMATIONS APPAREIL (Multi-appareils)
  // ================================================================

  @Column({ type: 'varchar', length: 255, default: 'Appareil inconnu' })
  device_name: string; // Ex: "iPhone 14", "MacBook Pro", "Samsung Galaxy"

  @Column({ type: 'varchar', length: 50, nullable: true })
  device_type: string | null; // 'mobile', 'desktop', 'tablet'

  @Column({ type: 'text', nullable: true })
  browser_info: string | null; // User-Agent du navigateur

  // ================================================================
  // RESIDENT KEY (Passkey - Connexion sans username)
  // ================================================================

  @Column({ type: 'boolean', default: false, nullable: false })
  is_resident_key: boolean; // true = peut se connecter sans username

  @Column({ type: 'text', nullable: true })
  user_handle: string | null; // Handle utilisateur pour Resident Keys (base64url)

  // ================================================================
  // MÉTADONNÉES
  // ================================================================

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date | null;

  // ================================================================
  // MÉTHODES UTILITAIRES
  // ================================================================

  /**
   * Obtenir l'ID utilisateur (personnel_id ou client_id)
   */
  get userId(): number {
    return this.personnel_id || this.client_id!;
  }

  /**
   * Vérifier si le credential a été utilisé récemment (< 5 minutes)
   */
  get isRecentlyUsed(): boolean {
    if (!this.last_used_at) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.last_used_at > fiveMinutesAgo;
  }

  /**
   * Obtenir le nom d'affichage du credential
   */
  get displayName(): string {
    const deviceInfo = this.device_type
      ? `${this.device_name} (${this.device_type})`
      : this.device_name;

    const residentKeyLabel = this.is_resident_key ? ' [Passkey]' : '';

    return `${deviceInfo}${residentKeyLabel}`;
  }

  /**
   * Vérifier si le credential est valide
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Vérifier que credential_id est renseigné
    // WebAuthn credential IDs font généralement 16-32 bytes (22-44 caractères en base64url)
    if (!this.credential_id || this.credential_id.length < 16) {
      errors.push('credential_id trop court (min 16 caractères)');
    }

    // Vérifier que public_key est renseigné
    if (!this.public_key || this.public_key.length < 32) {
      errors.push('public_key invalide');
    }

    // Vérifier qu'un seul type d'utilisateur est défini
    if (
      (this.personnel_id !== null && this.client_id !== null) ||
      (this.personnel_id === null && this.client_id === null)
    ) {
      errors.push(
        'Le credential doit être lié soit à un personnel soit à un client (pas les deux)',
      );
    }

    // Vérifier cohérence user_type
    if (this.user_type === UserType.PERSONNEL && !this.personnel_id) {
      errors.push('user_type est PERSONNEL mais personnel_id est null');
    }

    if (this.user_type === UserType.CLIENT && !this.client_id) {
      errors.push('user_type est CLIENT mais client_id est null');
    }

    // Vérifier que le counter est >= 0
    if (this.counter < 0) {
      errors.push('counter ne peut pas être négatif');
    }

    // Si is_resident_key = true, user_handle doit être renseigné
    if (this.is_resident_key && !this.user_handle) {
      errors.push('Resident Key activé mais user_handle manquant');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Incrémenter le compteur anti-replay
   */
  incrementCounter(): void {
    this.counter = Number(this.counter) + 1;
  }

  /**
   * Mettre à jour la date de dernière utilisation
   */
  updateLastUsed(): void {
    this.last_used_at = new Date();
  }

  /**
   * Vérifier si le credential est inactif depuis longtemps
   * @param days Nombre de jours d'inactivité
   */
  isInactive(days: number = 90): boolean {
    if (!this.last_used_at) return true;

    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.last_used_at < daysAgo;
  }

  /**
   * Générer un user_handle unique pour Resident Keys
   * @param userId ID de l'utilisateur
   * @param userType Type d'utilisateur (personnel/client)
   */
  static generateUserHandle(userId: number, userType: UserType): string {
    const prefix = userType === UserType.PERSONNEL ? 'P' : 'C';
    const timestamp = Date.now();
    const randomBytes = Math.random().toString(36).substring(2, 15);
    const handleString = `${prefix}_${userId}_${timestamp}_${randomBytes}`;

    // Convertir en Base64URL
    return Buffer.from(handleString).toString('base64url');
  }

  /**
   * Décoder un user_handle pour récupérer l'ID utilisateur
   * @param userHandle Handle en base64url
   */
  static decodeUserHandle(userHandle: string): {
    userId: number;
    userType: UserType;
  } | null {
    try {
      const decoded = Buffer.from(userHandle, 'base64url').toString('utf-8');
      const parts = decoded.split('_');

      if (parts.length < 2) return null;

      const prefix = parts[0];
      const userId = parseInt(parts[1]);

      if (isNaN(userId)) return null;

      const userType =
        prefix === 'P' ? UserType.PERSONNEL : UserType.CLIENT;

      return { userId, userType };
    } catch (error) {
      return null;
    }
  }
}
