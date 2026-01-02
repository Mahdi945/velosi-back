import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('organisations')
export class Organisation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  nom: string;

  @Column({ length: 255, nullable: true })
  nom_affichage: string;

  @Column({ length: 100, unique: true })
  database_name: string;

  @Column({ type: 'text', nullable: true })
  logo_url: string;

  @Column({ length: 255, nullable: true })
  email_contact: string;

  @Column({ length: 50, nullable: true })
  telephone: string;

  @Column({ type: 'text', nullable: true })
  adresse: string;

  @Column({ 
    length: 20, 
    default: 'en_attente',
    type: 'varchar'
  })
  statut: 'actif' | 'inactif' | 'en_attente' | 'suspendu';

  @Column({ type: 'timestamp', nullable: true })
  date_creation: Date;

  @Column({ type: 'timestamp', nullable: true })
  date_derniere_connexion: Date;

  @Column({ length: 50, nullable: true })
  plan: string;

  @Column({ type: 'timestamp', nullable: true })
  date_expiration_abonnement: Date;

  @Column({ type: 'timestamp', nullable: true })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;

  // Champs SMTP
  @Column({ length: 255, nullable: true })
  smtp_host: string;

  @Column({ type: 'integer', nullable: true })
  smtp_port: number;

  @Column({ length: 255, nullable: true })
  smtp_user: string;

  @Column({ type: 'text', nullable: true })
  smtp_password: string;

  @Column({ length: 255, nullable: true })
  smtp_from_email: string;

  @Column({ length: 255, nullable: true })
  smtp_from_name: string;

  @Column({ type: 'boolean', default: false, nullable: true })
  smtp_use_tls: boolean;

  @Column({ type: 'boolean', default: false, nullable: true })
  smtp_enabled: boolean;

  @Column({ length: 100, nullable: true })
  slug: string;

  // Champs footer d'impression
  @Column({ length: 50, nullable: true })
  tel1: string;

  @Column({ length: 50, nullable: true })
  tel2: string;

  @Column({ length: 50, nullable: true })
  tel3: string;

  @Column({ length: 255, nullable: true })
  site_web: string;

  @Column({ length: 255, nullable: true })
  email_service_technique: string;

  // Informations de suivi
  @Column({ type: 'boolean', default: false })
  database_created: boolean;

  @Column({ type: 'boolean', default: false })
  has_users: boolean;

  @Column({ type: 'boolean', default: false })
  setup_completed: boolean;
}
