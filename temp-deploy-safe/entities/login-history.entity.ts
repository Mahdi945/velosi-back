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
 * Enum pour le statut de connexion
 */
export enum LoginStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

/**
 * Enum pour la méthode de connexion
 */
export enum LoginMethod {
  PASSWORD = 'password',
  BIOMETRIC = 'biometric',
  OTP = 'otp',
  SSO = 'sso',
}

/**
 * 📊 Entity LoginHistory
 * Historique complet des connexions pour Personnel et Clients
 * 
 * FONCTIONNALITÉS:
 * - Enregistrement automatique à chaque connexion/déconnexion
 * - Tracking des informations appareil et navigateur
 * - Géolocalisation (si disponible)
 * - Détection des tentatives échouées
 * - Calcul automatique de la durée de session
 */
@Entity('login_history')
export class LoginHistory {
  @PrimaryGeneratedColumn()
  id: number;

  // ================================================================
  // IDENTIFICATION UTILISATEUR
  // ================================================================

  @Column({ type: 'int', nullable: false })
  user_id: number;

  @Column({
    type: 'enum',
    enum: UserType,
    nullable: false,
  })
  user_type: UserType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  full_name: string;

  // Relations (optionnelles, pour faciliter les jointures)
  @ManyToOne(() => Personnel, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  personnel?: Personnel;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  client?: Client;

  // ================================================================
  // INFORMATIONS DE CONNEXION
  // ================================================================

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  login_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  logout_time: Date | null;

  @Column({ type: 'int', nullable: true })
  session_duration: number | null; // Durée en secondes

  // ================================================================
  // INFORMATIONS RÉSEAU
  // ================================================================

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null; // Support IPv4 et IPv6

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  // ================================================================
  // INFORMATIONS APPAREIL
  // ================================================================

  @Column({ type: 'varchar', length: 50, nullable: true })
  device_type: string | null; // desktop, mobile, tablet

  @Column({ type: 'varchar', length: 255, nullable: true })
  device_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  os_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  os_version: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  browser_version: string | null;

  // ================================================================
  // INFORMATIONS GÉOLOCALISATION
  // ================================================================

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  // ================================================================
  // STATUT ET DÉTAILS
  // ================================================================

  @Column({
    type: 'enum',
    enum: LoginMethod,
    default: LoginMethod.PASSWORD,
  })
  login_method: LoginMethod;

  @Column({
    type: 'enum',
    enum: LoginStatus,
    default: LoginStatus.SUCCESS,
  })
  status: LoginStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failure_reason: string | null;

  // ================================================================
  // MÉTADONNÉES
  // ================================================================

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // ================================================================
  // MÉTHODES UTILITAIRES
  // ================================================================

  /**
   * Calculer la durée de session
   */
  calculateSessionDuration(): number | null {
    if (!this.logout_time) return null;
    const duration = this.logout_time.getTime() - this.login_time.getTime();
    return Math.floor(duration / 1000); // Convertir en secondes
  }

  /**
   * Formater la durée de session en format lisible
   */
  getFormattedDuration(): string {
    if (!this.session_duration) return 'En cours...';
    
    const hours = Math.floor(this.session_duration / 3600);
    const minutes = Math.floor((this.session_duration % 3600) / 60);
    const seconds = this.session_duration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Vérifier si la session est active
   */
  get isActive(): boolean {
    return this.logout_time === null;
  }

  /**
   * Obtenir le nom d'affichage de la méthode de connexion
   */
  get loginMethodLabel(): string {
    const labels = {
      [LoginMethod.PASSWORD]: 'Mot de passe',
      [LoginMethod.BIOMETRIC]: 'Biométrique',
      [LoginMethod.OTP]: 'Code OTP',
      [LoginMethod.SSO]: 'SSO',
    };
    return labels[this.login_method] || this.login_method;
  }

  /**
   * Obtenir l'icône correspondant au statut
   */
  get statusIcon(): string {
    const icons = {
      [LoginStatus.SUCCESS]: '✅',
      [LoginStatus.FAILED]: '❌',
      [LoginStatus.TIMEOUT]: '⏱️',
    };
    return icons[this.status] || '❓';
  }
}
