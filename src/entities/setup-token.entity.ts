import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organisation } from './organisation.entity';

/**
 * Entité SetupToken
 * Stockée dans la base principale 'shipnology'
 * Représente un token d'inscription envoyé à un nouveau client
 */
@Entity('setup_tokens')
export class SetupToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  token: string; // Token unique: "a7f3c8d2e9b4f1a6"

  @Column({ type: 'varchar', length: 255, nullable: false })
  email_destinataire: string; // Email du client: "mohamed@transport-rapide.tn"

  @Column({ type: 'varchar', length: 255, nullable: true })
  nom_contact: string; // Nom du contact: "Mohamed Ben Ali"

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: false })
  expires_at: Date; // Expiration: NOW() + 48h

  @Column({ type: 'boolean', default: false, nullable: false })
  used: boolean; // false tant que non utilisé

  @Column({ type: 'timestamp', nullable: true })
  used_at: Date; // Date d'utilisation

  @Column({ type: 'integer', nullable: true })
  organisation_id: number; // ID de l'organisation créée

  @ManyToOne(() => Organisation, { nullable: true })
  @JoinColumn({ name: 'organisation_id' })
  organisation: Organisation;

  @Column({ type: 'integer', nullable: true })
  generated_by: number; // ID du personnel MSP qui a généré le token

  @Column({ type: 'text', nullable: true })
  notes: string; // Notes internes (ex: "Client référé par partenaire X")
}
