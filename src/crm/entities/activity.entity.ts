import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Personnel } from '../../entities/personnel.entity';
import { Lead } from '../../entities/crm/lead.entity';
import { Opportunity } from '../../entities/crm/opportunity.entity';
// import { Quote } from '../../entities/crm/quote.entity'; // À implémenter
import { Client } from '../../entities/client.entity';
import { ActivityParticipant } from './activity-participant.entity';

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  TASK = 'task',
  NOTE = 'note',
  APPOINTMENT = 'appointment',
  FOLLOW_UP = 'follow_up',
  PRESENTATION = 'presentation',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  VISIT = 'visit',
  DEMO = 'demo',
}

export enum ActivityStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
  NO_SHOW = 'no_show',
}

export enum ActivityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('crm_activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', generated: 'uuid', unique: true })
  uuid: string;

  // Type et contenu
  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  type: ActivityType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Statut
  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.SCHEDULED,
  })
  status: ActivityStatus;

  @Column({
    type: 'enum',
    enum: ActivityPriority,
    default: ActivityPriority.MEDIUM,
  })
  priority: ActivityPriority;

  // Relations CRM
  @Column({ name: 'lead_id', nullable: true })
  leadId: number;

  @ManyToOne(() => Lead, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'opportunity_id', nullable: true })
  opportunityId: number;

  @ManyToOne(() => Opportunity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity: Opportunity;

  @Column({ name: 'quote_id', nullable: true })
  quoteId: number;

  // @ManyToOne(() => Quote, { nullable: true, onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'quote_id' })
  // quote: Quote; // À implémenter quand Quote sera créé

  @Column({ name: 'client_id', nullable: true })
  clientId: number;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  // Dates et durée
  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number;

  @Column({ name: 'reminder_at', type: 'timestamp', nullable: true })
  reminderAt: Date;

  // Localisation
  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ name: 'meeting_link', length: 500, nullable: true })
  meetingLink: string;

  // Gestion
  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: number;

  @ManyToOne(() => Personnel, { eager: true, nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedToPersonnel: Personnel;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => Personnel)
  @JoinColumn({ name: 'created_by' })
  creator: Personnel;

  // Résultats
  @Column({ type: 'text', nullable: true })
  outcome: string;

  @Column({ name: 'next_steps', type: 'text', nullable: true })
  nextSteps: string;

  @Column({ name: 'follow_up_date', type: 'timestamp', nullable: true })
  followUpDate: Date;

  // Récurrence
  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurring_pattern', type: 'jsonb', nullable: true })
  recurringPattern: any;

  @Column({ name: 'parent_activity_id', nullable: true })
  parentActivityId: number;

  @ManyToOne(() => Activity, { nullable: true })
  @JoinColumn({ name: 'parent_activity_id' })
  parentActivity: Activity;

  // Métadonnées
  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  // Pièces jointes
  @Column({ type: 'jsonb', default: '[]' })
  attachments: Array<{
    fileName: string;
    originalName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
  }>;

  // Participants
  @OneToMany(() => ActivityParticipant, (participant) => participant.activity, {
    cascade: true,
  })
  participants: ActivityParticipant[];

  // Audit
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
