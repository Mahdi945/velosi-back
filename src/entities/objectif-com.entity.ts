import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Personnel } from './personnel.entity';

@Entity('objectif_com')
export class ObjectifCom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: false })
  id_personnel: number;

  @Column({ type: 'varchar', nullable: false })
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  objectif_ca: number;

  @Column({ type: 'integer', nullable: true })
  objectif_clients: number;

  @Column({ type: 'date', nullable: true })
  date_debut: Date;

  @Column({ type: 'date', nullable: true })
  date_fin: Date;

  @Column({ type: 'varchar', nullable: true, default: 'en_cours' })
  statut: string; // en_cours, atteint, non_atteint, suspendu

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  progression: number; // Pourcentage de progression

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;

  // Relation avec Personnel
  @ManyToOne(() => Personnel, (personnel) => personnel.objectifs)
  @JoinColumn({ name: 'id_personnel' })
  personnel: Personnel;
}
