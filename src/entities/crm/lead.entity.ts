import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Personnel } from '../personnel.entity';
// TODO: Créer les entités Opportunity et Activity
// import { Opportunity } from './opportunity.entity';
// import { Activity } from './activity.entity';

export enum LeadSource {
  WEBSITE = 'website',
  EMAIL = 'email',
  PHONE = 'phone',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  TRADE_SHOW = 'trade_show',
  COLD_CALL = 'cold_call',
  PARTNER = 'partner',
  ADVERTISEMENT = 'advertisement',
  OTHER = 'other',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  UNQUALIFIED = 'unqualified',
  NURTURING = 'nurturing',
  CONVERTED = 'converted',
  CLIENT = 'client', // ✅ Prospect devenu client après acceptation d'une cotation
  LOST = 'lost',
}

export enum TrafficType {
  IMPORT = 'import',
  EXPORT = 'export',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('crm_leads')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', generated: 'uuid', unique: true })
  uuid: string;

  // Informations personnelles
  @Column({ name: 'full_name', length: 200 })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, length: 20 })
  phone: string;

  // Informations entreprise
  @Column()
  company: string;

  @Column({ nullable: true, length: 100 })
  position: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true, length: 100 })
  industry: string;

  @Column({ name: 'employee_count', nullable: true })
  employeeCount: number;

  // Classification prospect
  @Column({
    type: 'enum',
    enum: LeadSource,
    default: LeadSource.WEBSITE,
  })
  source: LeadSource;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  // Transport spécifique
  @Column({ name: 'transport_needs', type: 'text', array: true, nullable: true })
  transportNeeds: string[];

  @Column({
    type: 'enum',
    enum: TrafficType,
    nullable: true,
  })
  traffic: TrafficType;

  @Column({ name: 'annual_volume', type: 'decimal', precision: 12, scale: 2, nullable: true })
  annualVolume: number;

  @Column({ name: 'current_provider', nullable: true })
  currentProvider: string;

  @Column({ name: 'contract_end_date', type: 'date', nullable: true })
  contractEndDate: Date;

  // Géographie
  @Column({ nullable: true, length: 300 })
  street: string;

  @Column({ nullable: true, length: 100 })
  city: string;

  @Column({ nullable: true, length: 100 })
  state: string;

  @Column({ name: 'postal_code', nullable: true, length: 20 })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  @Column({ name: 'is_local', default: true })
  isLocal: boolean;

  // Gestion commerciale
  @Column({ name: 'assigned_to', nullable: true })
  assignedToId: number;

  @ManyToOne(() => Personnel, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: Personnel;

  @Column({ name: 'estimated_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedValue: number;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Dates de suivi
  @Column({ name: 'last_contact_date', type: 'timestamp', nullable: true })
  lastContactDate: Date;

  @Column({ name: 'next_followup_date', type: 'timestamp', nullable: true })
  nextFollowupDate: Date;

  @Column({ name: 'qualified_date', type: 'timestamp', nullable: true })
  qualifiedDate: Date;

  @Column({ name: 'converted_date', type: 'timestamp', nullable: true })
  convertedDate: Date;

  // Relations - TODO: Activer quand les entités Opportunity et Activity seront créées
  // @OneToMany(() => Opportunity, opportunity => opportunity.lead)
  // opportunities: Opportunity[];

  // @OneToMany(() => Activity, activity => activity.lead)
  // activities: Activity[];

  // Audit
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdById: number;

  @ManyToOne(() => Personnel)
  @JoinColumn({ name: 'created_by' })
  createdBy: Personnel;

  @Column({ name: 'updated_by', nullable: true })
  updatedById: number;

  @ManyToOne(() => Personnel)
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Personnel;
}