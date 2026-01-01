import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Entité Organisation
 * Stockée dans la base principale 'shipnology'
 * Représente une entreprise cliente qui utilise le système
 */
@Entity('organisations')
export class Organisation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nom: string; // Nom officiel: "Transport Rapide SARL"

  @Column({ type: 'varchar', length: 100, nullable: true })
  nom_affichage: string; // Nom court: "Transport Rapide"

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  database_name: string; // Nom de la BDD dédiée: "shipnology_transport_rapide"

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string; // Chemin vers le logo: "/uploads/logos/org_1_logo.png"

  @Column({ type: 'varchar', length: 255, nullable: false })
  email_contact: string; // Email de contact principal

  @Column({ type: 'varchar', length: 50, nullable: true })
  telephone: string; // Téléphone de l'organisation

  @Column({ type: 'text', nullable: true })
  adresse: string; // Adresse physique

  @Column({
    type: 'varchar',
    length: 20,
    default: 'actif',
    nullable: false
  })
  statut: 'actif' | 'suspendu' | 'inactif'; // Statut de l'organisation

  @Column({ type: 'timestamp', nullable: true })
  date_derniere_connexion: Date; // Dernière activité

  @Column({ type: 'varchar', length: 50, default: 'standard', nullable: true })
  plan: string; // Plan d'abonnement: "basic", "standard", "premium"

  @Column({ type: 'date', nullable: true })
  date_expiration_abonnement: Date; // Date d'expiration du plan

  // Configuration SMTP personnalisée par organisation
  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  slug: string; // Identifiant URL-friendly: "velosi", "transport-rapide"

  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_host: string; // Ex: "smtp.gmail.com", "mail.infomaniak.com"

  @Column({ type: 'integer', nullable: true, default: 587 })
  smtp_port: number; // Port SMTP (587 pour TLS, 465 pour SSL, 25 pour non-sécurisé)

  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_user: string; // Utilisateur SMTP: "contact@transport-rapide.com"

  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_password: string; // Mot de passe SMTP (⚠️ chiffrer en production)

  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_from_email: string; // Email expéditeur: "noreply@transport-rapide.com"

  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_from_name: string; // Nom expéditeur: "Transport Rapide Support"

  @Column({ type: 'boolean', default: false })
  smtp_use_tls: boolean; // Utiliser TLS/SSL

  @Column({ type: 'boolean', default: false })
  smtp_enabled: boolean; // Si false, utiliser la config SMTP globale du système

  // Champs footer d'impression
  @Column({ type: 'varchar', length: 50, nullable: true })
  tel1: string; // Téléphone 1

  @Column({ type: 'varchar', length: 50, nullable: true })
  tel2: string; // Téléphone 2

  @Column({ type: 'varchar', length: 50, nullable: true })
  tel3: string; // Téléphone 3

  @Column({ type: 'varchar', length: 255, nullable: true })
  site_web: string; // Site web de l'organisation

  @Column({ type: 'varchar', length: 255, nullable: true })
  email_service_technique: string; // Email du service technique

  // Informations de suivi
  @Column({ type: 'boolean', default: false })
  database_created: boolean; // Base de données créée

  @Column({ type: 'boolean', default: false })
  has_users: boolean; // A des utilisateurs

  @Column({ type: 'boolean', default: false })
  setup_completed: boolean; // Configuration terminée

  @CreateDateColumn({ type: 'timestamp' })
  date_creation: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
