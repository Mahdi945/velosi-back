import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { BCsusTVA } from './bcsus-tva.entity';

@Entity('AutorisationsTVA')
export class AutorisationTVA {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  numeroAutorisation: string;

  @Column({ type: 'date', nullable: true })
  dateDebutValidite: Date;

  @Column({ type: 'date', nullable: true })
  dateFinValidite: Date;

  @Column({ type: 'date', nullable: true })
  dateAutorisation: Date;

  @Column({ type: 'text', nullable: true })
  imagePath: string;

  @Column({ type: 'varchar', length: 20, default: 'AUTORISATION' })
  typeDocument: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceDocument: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIF' })
  statutAutorisation: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Relations
  @ManyToOne(() => Client, (client) => client.autorisationsTVA, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id', referencedColumnName: 'id' })
  client: Client;

  @OneToMany(() => BCsusTVA, (bonCommande) => bonCommande.autorisation, { cascade: true })
  bonsCommande: BCsusTVA[];

  // Méthodes utilitaires
  get isValid(): boolean {
    const now = new Date();
    return (
      this.is_active &&
      this.statutAutorisation === 'ACTIF' &&
      (!this.dateDebutValidite || this.dateDebutValidite <= now) &&
      (!this.dateFinValidite || this.dateFinValidite >= now)
    );
  }

  get isExpired(): boolean {
    const now = new Date();
    return (
      this.statutAutorisation === 'EXPIRE' ||
      (this.dateFinValidite && this.dateFinValidite < now)
    );
  }

  get isNotYetValid(): boolean {
    const now = new Date();
    return (
      this.dateDebutValidite && 
      this.dateDebutValidite > now &&
      this.statutAutorisation === 'ACTIF'
    );
  }

  get statusText(): string {
    if (!this.is_active) return 'INACTIF';
    if (this.statutAutorisation === 'SUSPENDU') return 'SUSPENDU';
    if (this.statutAutorisation === 'ANNULE') return 'ANNULE';
    if (this.isExpired) return 'EXPIRE';
    if (this.isNotYetValid) return 'EN_ATTENTE';
    return 'ACTIF';
  }

  get dureeValidite(): number | null {
    if (!this.dateDebutValidite || !this.dateFinValidite) return null;
    const diffTime = Math.abs(this.dateFinValidite.getTime() - this.dateDebutValidite.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Retourne le nombre de jours
  }

  get nombreBonsCommande(): number {
    return this.bonsCommande ? this.bonsCommande.filter(bc => bc.is_active).length : 0;
  }

  get montantTotalBonsCommande(): number {
    if (!this.bonsCommande) return 0;
    return this.bonsCommande
      .filter(bc => bc.is_active && bc.statut === 'ACTIF')
      .reduce((total, bc) => total + Number(bc.montantBonCommande), 0);
  }
}