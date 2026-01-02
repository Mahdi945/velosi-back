import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Armateur } from './armateur.entity';

@Entity('navires')
export class Navire {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  libelle: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationalite: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  conducteur: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  longueur: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  largeur: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'tirant_air' })
  tirantAir: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'tirant_eau' })
  tirantEau: number;

  @Column({ type: 'int', nullable: true, name: 'jauge_brute' })
  jaugeBrute: number;

  @Column({ type: 'int', nullable: true, name: 'jauge_net' })
  jaugeNet: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'code_omi' })
  codeOmi: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pav: string;

  @Column({ type: 'int', nullable: true, name: 'armateur_id' })
  armateurId: number;

  @ManyToOne(() => Armateur, { nullable: true, eager: true })
  @JoinColumn({ name: 'armateur_id' })
  armateur: Armateur;

  @Column({ type: 'varchar', length: 20, default: 'actif' })
  statut: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'int', nullable: true, name: 'created_by' })
  createdBy: number;

  @Column({ type: 'int', nullable: true, name: 'updated_by' })
  updatedBy: number;
}
