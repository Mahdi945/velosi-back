import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ObjectifCom } from './objectif-com.entity';
import { BiometricCredential } from './biometric-credential.entity';

@Entity('personnel')
@Index('idx_personnel_org_username', ['organisation_id', 'nom_utilisateur'], { unique: true })
@Index('idx_personnel_org_email', ['organisation_id', 'email'], { unique: true })
export class Personnel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: false })
  organisation_id: number; // ID de l'organisation (référence vers shipnology.organisations)

  @Column({ type: 'varchar', nullable: false })
  nom: string;

  @Column({ type: 'varchar', nullable: false })
  prenom: string;

  @Column({ type: 'varchar', nullable: false })
  nom_utilisateur: string; // UNIQUE par organisation (voir @Index en haut)

  @Column({ type: 'varchar', nullable: false })
  role: string;

  @Column({ type: 'varchar', nullable: true })
  telephone: string;

  @Column({ type: 'varchar', nullable: true })
  email: string; // UNIQUE par organisation (voir @Index en haut)

  @Column({ type: 'varchar', nullable: false, default: 'Homme' })
  genre: string;

  @Column({ type: 'varchar', nullable: true, default: 'actif' })
  statut: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Exclude()
  @Column({ type: 'varchar', nullable: false })
  mot_de_passe: string;

  @Column({ type: 'uuid', nullable: true })
  keycloak_id: string; // Pas unique car peut être null pour plusieurs utilisateurs

  @Column({ type: 'text', nullable: true, default: 'uploads/profiles/default-avatar.png' })
  photo: string; // URL ou chemin vers la photo de profil

  @Column({ type: 'boolean', nullable: false, default: true })
  first_login: boolean; // Flag pour indiquer si c'est le premier login (mot de passe à changer)

  @Column({ type: 'boolean', nullable: false, default: false })
  auto_delete: boolean; // Flag pour indiquer si le compte doit être supprimé automatiquement après 7 jours de désactivation

  // Champs de géolocalisation
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number; // Latitude GPS (-90 à +90)

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number; // Longitude GPS (-180 à +180)

  @Column({ type: 'timestamp', nullable: true })
  last_location_update: Date; // Timestamp de la dernière mise à jour de position

  @Column({ type: 'boolean', nullable: false, default: false })
  location_tracking_enabled: boolean; // Indique si le suivi GPS est activé

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  location_accuracy: number; // Précision de la localisation en mètres

  @Column({ type: 'varchar', length: 50, nullable: false, default: 'unknown' })
  location_source: string; // Source de la localisation (gps, network, passive)

  @Column({ type: 'boolean', nullable: false, default: false })
  is_location_active: boolean; // Position active (dernière position < 5 min)

  @Column({ type: 'boolean', nullable: false, default: false })
  is_superviseur: boolean; // Indique si le personnel a le statut de superviseur (peut créer du personnel administratif)

  // Champs de gestion de session et statut en ligne
  @Column({ type: 'boolean', nullable: false, default: false })
  statut_en_ligne: boolean; // Indique si l'utilisateur est actuellement connecté (true) ou hors ligne (false)

  @Column({ type: 'timestamp', nullable: true })
  last_activity: Date; // Timestamp de la dernière activité de l'utilisateur pour gérer l'expiration de session

  // Relations
  @OneToMany(() => ObjectifCom, (objectif) => objectif.personnel)
  objectifs: ObjectifCom[];

  @OneToMany(() => BiometricCredential, (credential) => credential.personnel)
  biometricCredentials: BiometricCredential[];

  // Méthode virtuelle pour obtenir le nom complet
  get fullName(): string {
    return `${this.prenom} ${this.nom}`;
  }

  // Méthode virtuelle pour obtenir l'username (utilise nom_utilisateur)
  get username(): string {
    return this.nom_utilisateur;
  }

  // Méthode pour vérifier si l'utilisateur est actif
  get isActive(): boolean {
    return this.statut === 'actif';
  }

  // Méthodes de géolocalisation
  get hasValidLocation(): boolean {
    return this.latitude !== null && this.longitude !== null;
  }

  get isLocationRecent(): boolean {
    if (!this.last_location_update) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.last_location_update > fiveMinutesAgo;
  }

  get locationStatus(): 'active' | 'inactive' | 'disabled' {
    if (!this.location_tracking_enabled) return 'disabled';
    if (this.is_location_active && this.isLocationRecent) return 'active';
    return 'inactive';
  }

  // Méthodes de gestion de session et statut en ligne
  get isOnline(): boolean {
    return this.statut_en_ligne === true;
  }

  get isSessionValid(): boolean {
    if (!this.last_activity) return false;
    const now = new Date();
    const sessionDuration = now.getTime() - this.last_activity.getTime();
    const maxSessionDuration = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
    return sessionDuration < maxSessionDuration;
  }

  get sessionExpiresIn(): number | null {
    if (!this.last_activity) return null;
    const now = new Date();
    const sessionDuration = now.getTime() - this.last_activity.getTime();
    const maxSessionDuration = 24 * 60 * 60 * 1000; // 24 heures
    const remaining = maxSessionDuration - sessionDuration;
    return remaining > 0 ? remaining : 0;
  }

  // Méthode pour calculer la distance avec une autre position
  distanceTo(lat: number, lng: number): number | null {
    if (!this.hasValidLocation) return null;
    
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(lat - this.latitude);
    const dLng = this.toRadians(lng - this.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this.latitude)) *
        Math.cos(this.toRadians(lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance en km
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
