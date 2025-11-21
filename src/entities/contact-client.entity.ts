import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('contact_client')
export class ContactClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_client' })
  id_client: number;

  @Column({ type: 'varchar', nullable: true })
  nom: string;

  @Column({ type: 'varchar', nullable: true })
  prenom: string;

  @Column({ type: 'varchar', nullable: true })
  tel1: string;

  @Column({ type: 'varchar', nullable: true })
  tel2: string;

  @Column({ type: 'varchar', nullable: true })
  tel3: string;

  @Column({ type: 'varchar', nullable: true })
  fax: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  mail1: string;

  @Column({ type: 'varchar', nullable: true })
  mail2: string;

  @Column({ type: 'varchar', nullable: true })
  fonction: string;

  @Column({ type: 'boolean', default: false, name: 'is_principal' })
  is_principal: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relation avec Client - utilise id_client comme clé étrangère
  @ManyToOne(() => Client, (client) => client.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_client' })
  client: Client;
}
