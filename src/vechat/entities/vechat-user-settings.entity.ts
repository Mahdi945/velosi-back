import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('vechat_user_settings')
@Index(['user_id', 'user_type'], { unique: true })
export class VechatUserSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({
    type: 'enum',
    enum: ['personnel', 'client'],
    default: 'personnel'
  })
  user_type: 'personnel' | 'client';

  @Column({ default: true })
  email_notifications: boolean;

  @Column({ default: true })
  push_notifications: boolean;

  @Column({ default: true })
  sound_notifications: boolean;

  @Column({
    type: 'enum',
    enum: ['light', 'dark', 'auto'],
    default: 'light'
  })
  theme: 'light' | 'dark' | 'auto';

  @Column({
    type: 'enum',
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  })
  font_size: 'small' | 'medium' | 'large';

  @Column({ default: true })
  show_online_status: boolean;

  @Column({ default: true })
  show_read_receipts: boolean;

  @Column({ type: 'json', nullable: true })
  custom_settings: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}