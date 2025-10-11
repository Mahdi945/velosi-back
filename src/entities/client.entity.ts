import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ContactClient } from './contact-client.entity';
import { AutorisationTVA } from './autorisation-tva.entity';
import { BCsusTVA } from './bcsus-tva.entity';

export enum EtatFiscal {
  ASSUJETTI_TVA = 'ASSUJETTI_TVA',
  SUSPENSION_TVA = 'SUSPENSION_TVA',
  EXONERE = 'EXONERE',
}

@Entity('client')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  nom: string;

  @Column({ type: 'varchar', nullable: true })
  interlocuteur: string;

  @Column({ type: 'varchar', nullable: true })
  categorie: string;

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

  @Column({
    type: 'enum',
    enum: EtatFiscal,
    default: EtatFiscal.ASSUJETTI_TVA,
  })
  etat_fiscal: EtatFiscal;

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

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  keycloak_id: string;

  @Column({ type: 'text', nullable: true, default: 'uploads/profiles/default-avatar.png' })
  photo: string; // URL ou chemin vers la photo de profil

  @Column({ type: 'varchar', nullable: true, default: 'actif' })
  statut: string; // Statut du client (actif, inactif, suspendu, etc.)

  @Column({ type: 'boolean', nullable: false, default: true })
  first_login: boolean; // Flag pour indiquer si c'est le premier login (mot de passe à changer)

  @Column({ type: 'boolean', nullable: false, default: false })
  auto_delete: boolean; // Flag pour indiquer si le compte doit être supprimé automatiquement après 7 jours de désactivation

  // Relations
  @OneToMany(() => ContactClient, (contact) => contact.client)
  contacts: ContactClient[];

  @OneToMany(() => AutorisationTVA, (autorisation) => autorisation.client, { cascade: true })
  autorisationsTVA: AutorisationTVA[];

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

  // Méthodes pour la gestion de l'état fiscal
  get isSuspensionTVA(): boolean {
    return this.etat_fiscal === EtatFiscal.SUSPENSION_TVA;
  }

  get isAssujettiTVA(): boolean {
    return this.etat_fiscal === EtatFiscal.ASSUJETTI_TVA;
  }

  get isExonere(): boolean {
    return this.etat_fiscal === EtatFiscal.EXONERE;
  }

  // Vérifie si le client a des autorisations TVA valides
  hasValidAutorisationsTVA(): boolean {
    if (!this.autorisationsTVA || this.autorisationsTVA.length === 0) {
      return false;
    }
    return this.autorisationsTVA.some(autorisation => autorisation.isValid);
  }

  // Obtient l'autorisation TVA active (la plus récente et valide)
  getActiveAutorisationTVA(): AutorisationTVA | null {
    if (!this.autorisationsTVA || this.autorisationsTVA.length === 0) {
      return null;
    }
    
    const validAutorisations = this.autorisationsTVA.filter(auth => auth.isValid);
    if (validAutorisations.length === 0) {
      return null;
    }

    // Retourne la plus récente
    return validAutorisations.reduce((latest, current) => {
      return current.dateAutorisation > latest.dateAutorisation ? current : latest;
    });
  }

  // Obtient tous les bons de commande via les autorisations
  getAllBonsCommande(): BCsusTVA[] {
    if (!this.autorisationsTVA || this.autorisationsTVA.length === 0) {
      return [];
    }
    
    return this.autorisationsTVA
      .filter(auth => auth.bonsCommande && auth.bonsCommande.length > 0)
      .flatMap(auth => auth.bonsCommande)
      .filter(bc => bc.is_active);
  }

  // Obtient le montant total des bons de commande actifs
  getTotalMontantBonsCommande(): number {
    const bonsCommande = this.getAllBonsCommande();
    return bonsCommande
      .filter(bc => bc.statut === 'ACTIF')
      .reduce((total, bc) => total + Number(bc.montantBonCommande), 0);
  }

  // Valide la cohérence de l'état fiscal avec les autorisations
  validateEtatFiscal(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.etat_fiscal === EtatFiscal.SUSPENSION_TVA) {
      const activeAutorisation = this.getActiveAutorisationTVA();
      if (!activeAutorisation || activeAutorisation.statutAutorisation !== 'SUSPENDU') {
        errors.push('Client en suspension TVA sans autorisation de suspension valide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
