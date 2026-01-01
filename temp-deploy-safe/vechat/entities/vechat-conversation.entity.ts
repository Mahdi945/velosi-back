import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('vechat_conversations')
@Index(['participant1_id', 'participant1_type', 'participant2_id', 'participant2_type'], { unique: true })
@Index(['last_message_at'])
export class VechatConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  participant1_id: number;

  @Column({
    type: 'enum',
    enum: ['personnel', 'client'],
    default: 'personnel'
  })
  participant1_type: 'personnel' | 'client';

  @Column()
  participant2_id: number;

  @Column({
    type: 'enum',
    enum: ['personnel', 'client'],
    default: 'personnel'
  })
  participant2_type: 'personnel' | 'client';

  @Column({ nullable: true })
  last_message_id: number;

  @Column({ type: 'timestamp', nullable: true })
  last_message_at: Date;

  @Column({ default: 0 })
  unread_count_participant1: number;

  @Column({ default: 0 })
  unread_count_participant2: number;

  @Column({ default: false })
  is_archived_by_participant1: boolean;

  @Column({ default: false })
  is_archived_by_participant2: boolean;

  @Column({ default: false })
  is_muted_by_participant1: boolean;

  @Column({ default: false })
  is_muted_by_participant2: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}