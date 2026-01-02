import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('vechat_presence')
@Index(['user_id', 'user_type'], { unique: true })
@Index(['status'])
@Index(['last_seen'])
export class VechatPresence {
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

  @Column({
    type: 'enum',
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  })
  status: 'online' | 'offline' | 'away' | 'busy';

  @Column({ type: 'timestamp', nullable: true })
  last_seen: Date;

  @Column({ type: 'timestamp', nullable: true })
  connected_at: Date;

  @Column({ type: 'text', nullable: true })
  connection_info: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}