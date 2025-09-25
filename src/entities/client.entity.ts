import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ContactClient } from './contact-client.entity';

@Entity('client')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  nom: string;

  @Column({ type: 'varchar', nullable: true })
  interlocuteur: string;

  @Column({ type: 'integer', nullable: true })
  categorie: number;

  @Column({ type: 'varchar', nullable: true })
  type_client: string;

  @Column({ type: 'varchar', nullable: true })
  adresse: string;

  @Column({ type: 'varchar', nullable: true })
  code_postal: string;

  @Column({ type: 'varchar', nullable: true })
  ville: string;

  @Column({ type: 'varchar', nullable: true })
  pays: string;

  @Column({ type: 'varchar', nullable: true })
  id_fiscal: string;

  @Column({ type: 'varchar', nullable: true })
  nature: string;

  @Column({ type: 'varchar', nullable: true })
  c_douane: string;

  @Column({ type: 'integer', nullable: true })
  nbr_jour_ech: number;

  @Column({ type: 'varchar', nullable: true })
  etat_fiscal: string;

  @Column({ type: 'varchar', nullable: true })
  n_auto: string;

  @Column({ type: 'date', nullable: true })
  date_auto: Date;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  franchise_sur: number;

  @Column({ type: 'date', nullable: true })
  date_fin: Date;

  @Column({ type: 'boolean', nullable: true })
  blocage: boolean;

  @Column({ type: 'varchar', nullable: true })
  devise: string;

  @Column({ type: 'boolean', nullable: true })
  timbre: boolean;

  @Column({ type: 'varchar', nullable: true })
  compte_cpt: string;

  @Column({ type: 'varchar', nullable: true })
  sec_activite: string;

  @Column({ type: 'varchar', nullable: true })
  charge_com: string;

  @Column({ type: 'boolean', nullable: true })
  stop_envoie_solde: boolean;

  @Column({ type: 'boolean', nullable: true })
  maj_web: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  d_initial: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  c_initial: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  solde: number;

  @Exclude()
  @Column({ type: 'varchar', nullable: false })
  mot_de_passe: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'uuid', nullable: true })
  keycloak_id: string;

  @Column({ type: 'text', nullable: true, default: 'uploads/profiles/default-avatar.png' })
  photo: string; // URL ou chemin vers la photo de profil

  @Column({ type: 'varchar', nullable: true, default: 'actif' })
  statut: string; // Statut du client (actif, inactif, suspendu, etc.)

  // Relations
  @OneToMany(() => ContactClient, (contact) => contact.client)
  contacts: ContactClient[];

  // Méthode virtuelle pour obtenir le nom d'utilisateur (utilise le nom ou l'id)
  get username(): string {
    return this.nom || `client_${this.id}`;
  }

  // Méthode virtuelle pour obtenir l'email (utilise l'interlocuteur si pas d'email spécifique)
  get email(): string {
    return (
      this.interlocuteur ||
      `${this.nom?.toLowerCase().replace(/\s+/g, '.')}@client.velosi.com`
    );
  }

  // Rôle par défaut pour les clients
  get role(): string {
    return 'client';
  }
}
