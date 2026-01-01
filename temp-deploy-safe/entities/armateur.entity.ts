import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('armateurs')
export class Armateur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  abreviation: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  adresse: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ville: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'France' })
  pays: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'codepostal' })
  codePostal: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'telephonesecondaire' })
  telephoneSecondaire: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  fax: string;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'siteweb' })
  siteWeb: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true, name: 'tarif20pieds' })
  tarif20Pieds: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true, name: 'tarif40pieds' })
  tarif40Pieds: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true, name: 'tarif45pieds' })
  tarif45Pieds: number;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: true, name: 'isactive' })
  isActive: boolean;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}
