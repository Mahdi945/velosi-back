import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Activity } from './activity.entity';
import { Personnel } from '../../entities/personnel.entity';

export enum ParticipantType {
  INTERNAL = 'internal',
  CLIENT = 'client',
  PROSPECT = 'prospect',
  PARTNER = 'partner',
  VENDOR = 'vendor',
}

export enum ResponseStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
}

@Entity('crm_activity_participants')
export class ActivityParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'activity_id' })
  activityId: number;

  @ManyToOne(() => Activity, (activity) => activity.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  // Participant
  @Column({
    name: 'participant_type',
    type: 'enum',
    enum: ParticipantType,
  })
  participantType: ParticipantType;

  @Column({ name: 'personnel_id', nullable: true })
  personnelId: number;

  @ManyToOne(() => Personnel, { nullable: true })
  @JoinColumn({ name: 'personnel_id' })
  personnel: Personnel;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  // Réponse
  @Column({
    name: 'response_status',
    type: 'enum',
    enum: ResponseStatus,
    default: ResponseStatus.PENDING,
  })
  responseStatus: ResponseStatus;

  @Column({ name: 'response_date', type: 'timestamp', nullable: true })
  responseDate: Date;

  // Audit
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
