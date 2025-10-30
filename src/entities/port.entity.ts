import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ports')
export class Port {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  libelle: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  abbreviation: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ville: string;

  @Column({ type: 'varchar', length: 100 })
  pays: string;

  @Column({ type: 'boolean', default: false, name: 'isactive' })
  isActive: boolean;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}
