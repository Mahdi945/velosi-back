import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organisation } from './organisation.entity';

@Entity('setup_tokens')
export class SetupToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 255, name: 'email_destinataire' })
  email_destinataire: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'nom_contact' })
  nom_contact: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expires_at: Date;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'used_at' })
  used_at: Date;

  @Column({ type: 'integer', nullable: true, name: 'organisation_id' })
  organisation_id: number;

  @ManyToOne(() => Organisation)
  @JoinColumn({ name: 'organisation_id' })
  organisation: Organisation;

  @Column({ type: 'integer', nullable: true, name: 'generated_by' })
  generated_by: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
