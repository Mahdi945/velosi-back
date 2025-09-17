import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('contact_client')
export class ContactClient {
  @PrimaryColumn({ name: 'id_client' })
  id_client: number;

  @Column({ type: 'varchar', nullable: true })
  tel1: string;

  @Column({ type: 'varchar', nullable: true })
  tel2: string;

  @Column({ type: 'varchar', nullable: true })
  tel3: string;

  @Column({ type: 'varchar', nullable: true })
  fax: string;

  @Column({ type: 'varchar', nullable: true })
  mail1: string;

  @Column({ type: 'varchar', nullable: true })
  mail2: string;

  @Column({ type: 'varchar', nullable: true })
  fonction: string;

  // Relation avec Client - utilise id_client comme clé étrangère
  @ManyToOne(() => Client, (client) => client.contacts)
  @JoinColumn({ name: 'id_client' })
  client: Client;
}
