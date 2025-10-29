import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('fournisseurs')
export class Fournisseur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  code: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ name: 'type_fournisseur', length: 20, default: 'local' })
  typeFournisseur: string; // 'local' | 'etranger'

  @Column({ length: 20, default: 'personne_morale' })
  categorie: string; // 'personne_morale' | 'personne_physique'

  @Column({ length: 250, nullable: true })
  activite: string;

  @Column({ name: 'nature_identification', length: 20, default: 'mf' })
  natureIdentification: string; // 'mf' | 'cin' | 'passeport' | 'carte_sejour' | 'autre'

  @Column({ name: 'numero_identification', length: 20, nullable: true })
  numeroIdentification: string;

  @Column({ name: 'code_fiscal', length: 20, nullable: true })
  codeFiscal: string;

  @Column({ name: 'type_mf', type: 'smallint', default: 0 })
  typeMf: number;

  @Column({ length: 300, nullable: true })
  adresse: string;

  @Column({ length: 100, nullable: true })
  adresse2: string;

  @Column({ length: 300, nullable: true })
  adresse3: string;

  @Column({ length: 30, nullable: true })
  ville: string;

  @Column({ name: 'code_postal', length: 10, nullable: true })
  codePostal: string;

  @Column({ length: 40, default: 'Tunisie' })
  pays: string;

  @Column({ name: 'nom_contact', length: 40, nullable: true })
  nomContact: string;

  @Column({ length: 20, nullable: true })
  telephone: string;

  @Column({ length: 20, nullable: true })
  fax: string;

  @Column({ length: 50, nullable: true })
  email: string;

  @Column({ name: 'rib_iban', length: 50, nullable: true })
  ribIban: string;

  @Column({ length: 50, nullable: true })
  swift: string;

  @Column({ name: 'adresse_banque', length: 100, nullable: true })
  adresseBanque: string;

  @Column({ name: 'code_pays_payeur', length: 8, nullable: true })
  codePaysPayeur: string;

  @Column({ name: 'modalite_paiement', length: 30, nullable: true })
  modalitePaiement: string;

  @Column({ name: 'delai_paiement', type: 'integer', default: 0 })
  delaiPaiement: number;

  @Column({ name: 'timbre_fiscal', type: 'boolean', default: false })
  timbreFiscal: boolean;

  @Column({ name: 'est_fournisseur_marchandise', type: 'boolean', default: true })
  estFournisseurMarchandise: boolean;

  @Column({ name: 'a_charge_fixe', type: 'boolean', default: false })
  aChargeFixe: boolean;

  @Column({ name: 'compte_comptable', length: 20, nullable: true })
  compteComptable: string;

  @Column({ length: 255, nullable: true })
  logo: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
