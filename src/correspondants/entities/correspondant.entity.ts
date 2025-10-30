import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('correspondants')
export class Correspondant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 20, default: 'LOCAL' })
  nature: string; // LOCAL ou ETRANGER

  @Column({ type: 'varchar', length: 255 })
  libelle: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  // Coordonnées
  @Column({ type: 'text', nullable: true })
  adresse: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ville: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'code_postal' })
  codePostal: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pays: string;

  // Contacts
  @Column({ type: 'varchar', length: 50, nullable: true })
  telephone: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'telephone_secondaire' })
  telephoneSecondaire: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fax: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'site_web' })
  siteWeb: string;

  // Informations fiscales
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'etat_fiscal' })
  etatFiscal: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0.000, name: 'tx_foids_volume' })
  txFoidsVolume: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'matricule_fiscal' })
  matriculeFiscal: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'type_mf' })
  typeMf: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  timbre: string;

  @Column({ type: 'integer', default: 0 })
  echeance: number;

  // Informations comptables
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0.000, name: 'debit_initial' })
  debitInitial: number;

  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0.000, name: 'credit_initial' })
  creditInitial: number;

  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0.000 })
  solde: number;

  @Column({ type: 'varchar', length: 10, default: 'TND' })
  devise: string;

  // Compétences
  @Column({ type: 'boolean', default: false, name: 'competence_maritime' })
  competenceMaritime: boolean;

  @Column({ type: 'boolean', default: false, name: 'competence_routier' })
  competenceRoutier: boolean;

  @Column({ type: 'boolean', default: false, name: 'competence_aerien' })
  competenceAerien: boolean;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Statut et métadonnées
  @Column({ type: 'varchar', length: 20, default: 'actif' })
  statut: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
