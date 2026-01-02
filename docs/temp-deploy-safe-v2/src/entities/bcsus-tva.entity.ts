import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AutorisationTVA } from './autorisation-tva.entity';

@Entity('BCsusTVA')
export class BCsusTVA {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  numeroBonCommande: string;

  @Column({ type: 'date', nullable: false })
  dateBonCommande: Date;

  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: false })
  montantBonCommande: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  imagePath: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIF' })
  statut: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Relations
  @ManyToOne(() => AutorisationTVA, (autorisation) => autorisation.bonsCommande, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'autorisation_id', referencedColumnName: 'id' })
  autorisation: AutorisationTVA;

  // Méthodes utilitaires
  get isValid(): boolean {
    return (
      this.is_active &&
      this.statut === 'ACTIF'
    );
  }

  get isExpired(): boolean {
    return this.statut === 'EXPIRE';
  }

  get statusText(): string {
    if (!this.is_active) return 'INACTIF';
    if (this.statut === 'SUSPENDU') return 'SUSPENDU';
    if (this.statut === 'ANNULE') return 'ANNULE';
    if (this.statut === 'EXPIRE') return 'EXPIRE';
    return 'ACTIF';
  }

  get numeroAutorisationFromRelation(): string | null {
    return this.autorisation?.numeroAutorisation || null;
  }
}