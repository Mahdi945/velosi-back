import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Generated,
  OneToMany,
} from 'typeorm';
import { Lead } from './lead.entity';
import { Personnel } from '../personnel.entity';
import { Client } from '../client.entity';
import { BaseEntityWithSoftDelete } from '../../common/entities/base-soft-delete.entity';

export enum OpportunityStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  NEEDS_ANALYSIS = 'needs_analysis',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

export enum TransportType {
  GROUPAGE = 'groupage', // LCL
  COMPLET = 'complet', // FCL
  ROUTIER = 'routier',
  AERIEN_NORMALE = 'aerien_normale',
  AERIEN_EXPRESSE = 'aerien_expresse'
}

export enum TrafficType {
  IMPORT = 'import',
  EXPORT = 'export'
}

export enum ServiceFrequency {
  ONE_TIME = 'one_time',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

@Entity('crm_opportunities')
export class Opportunity extends BaseEntityWithSoftDelete {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Generated('uuid')
  uuid: string;

  // Informations de base
  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'lead_id', nullable: true })
  leadId: number;

  @Column({ name: 'client_id', nullable: true })
  clientId: number;

  // Valeur et probabilité
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  value: number;

  // 💱 Multi-devises - Le montant 'value' est stocké en TND
  // La devise sélectionnée (EUR, USD, etc.) est conservée pour référence
  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string;

  @Column({ 
    type: 'integer', 
    default: 0,
    transformer: {
      to: (value: number) => Math.max(0, Math.min(100, value || 0)),
      from: (value: number) => value
    }
  })
  probability: number;

  // Pipeline
  @Column({
    type: 'enum',
    enum: OpportunityStage,
    default: OpportunityStage.PROSPECTING
  })
  stage: OpportunityStage;

  // Dates
  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate: Date;

  @Column({ name: 'actual_close_date', type: 'date', nullable: true })
  actualCloseDate: Date;

  // Transport spécifique
  @Column({ name: 'origin_address', type: 'text', nullable: true })
  originAddress: string;

  @Column({ name: 'destination_address', type: 'text', nullable: true })
  destinationAddress: string;

  @Column({
    name: 'transport_type',
    type: 'enum',
    enum: TransportType,
    nullable: true
  })
  transportType: TransportType;

  @Column({
    name: 'traffic',
    type: 'enum',
    enum: TrafficType,
    nullable: true,
  })
  traffic: TrafficType;

  @Column({
    name: 'service_frequency',
    type: 'enum',
    enum: ServiceFrequency,
    nullable: true
  })
  serviceFrequency: ServiceFrequency;

  @Column({ name: 'engine_type', type: 'int', nullable: true })
  engineType: number;

  @Column({ name: 'special_requirements', type: 'text', nullable: true })
  specialRequirements: string;

  // Gestion commerciale
  @Column({ name: 'assigned_to', nullable: true })
  assignedToId: number;

  @Column({ length: 50, default: 'inbound' })
  source: string;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM
  })
  priority: Priority;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'text', array: true, default: [] })
  competitors: string[];

  // Si gagné
  @Column({ name: 'won_description', type: 'text', nullable: true })
  wonDescription: string;

  // Si perdu
  @Column({ name: 'lost_reason', type: 'text', nullable: true })
  lostReason: string;

  @Column({ name: 'lost_to_competitor', length: 255, nullable: true })
  lostToCompetitor: string;

  // Audit
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdById: number;

  @Column({ name: 'updated_by', nullable: true })
  updatedById: number;

  // Relations
  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Personnel, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: Personnel;

  @ManyToOne(() => Personnel, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: Personnel;

  @ManyToOne(() => Personnel, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Personnel;

  // TODO: Relations avec quotes, activities, attachments
  // @OneToMany(() => Quote, quote => quote.opportunity)
  // quotes: Quote[];

  // @OneToMany(() => Activity, activity => activity.opportunity)
  // activities: Activity[];

  // @OneToMany(() => Attachment, attachment => attachment.opportunity)
  // attachments: Attachment[];
}