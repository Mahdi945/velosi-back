import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('vechat_messages')
@Index(['sender_id', 'sender_type'])
@Index(['receiver_id', 'receiver_type'])
@Index(['created_at'])
@Index(['is_read'])
export class VechatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sender_id: number;

  @Column({
    type: 'enum',
    enum: ['personnel', 'client'],
    default: 'personnel'
  })
  sender_type: 'personnel' | 'client';

  @Column()
  receiver_id: number;

  @Column({
    type: 'enum',
    enum: ['personnel', 'client'],
    default: 'personnel'
  })
  receiver_type: 'personnel' | 'client';

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({
    type: 'enum',
    enum: ['text', 'image', 'file', 'video', 'voice', 'audio', 'location'],
    default: 'text'
  })
  message_type: 'text' | 'image' | 'file' | 'video' | 'voice' | 'audio' | 'location';

  @Column({ nullable: true })
  file_url: string;

  @Column({ nullable: true })
  file_name: string;

  @Column({ nullable: true })
  file_size: number;

  @Column({ nullable: true })
  file_type: string;

  @Column({ nullable: true })
  reply_to_message_id: number;

  @Column({ default: false })
  is_read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date;

  @Column({ default: false })
  is_delivered: boolean;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date;

  @Column({ default: false })
  is_deleted_by_sender: boolean;

  @Column({ default: false })
  is_deleted_by_receiver: boolean;

  @Column({ default: false })
  is_edited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  edited_at: Date;

  @Column({ type: 'text', nullable: true })
  original_message: string;

  // Champs spécifiques pour la localisation
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  location_latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  location_longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  location_accuracy: number;

  // Champs spécifiques pour l'audio
  @Column({ nullable: true })
  audio_duration: number; // Durée en secondes

  @Column({ nullable: true })
  audio_waveform: string; // Données de forme d'onde (JSON)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}