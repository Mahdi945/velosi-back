import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lead } from '../../entities/crm/lead.entity';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { Client } from '../../entities/client.entity';
import { Personnel } from '../../entities/personnel.entity';
import { Engin } from '../../entities/engin.entity';
import { QuoteItem } from './quote-item.entity';
import { Activity } from './activity.entity';
import { BaseEntityWithSoftDelete } from '../../common/entities/base-soft-delete.entity';

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('crm_quotes')
export class Quote extends BaseEntityWithSoftDelete {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'quote_number', unique: true, length: 50 })
  quoteNumber: string;

  // Relations
  @Column({ name: 'opportunity_id', nullable: true })
  opportunityId: number;

  @ManyToOne(() => Opportunity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity: Opportunity;

  @Column({ name: 'lead_id', nullable: true })
  leadId: number;

  @ManyToOne(() => Lead, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'client_id', nullable: true })
  clientId: number;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  // Informations du devis
  @Column({ length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: QuoteStatus,
    default: QuoteStatus.DRAFT,
  })
  status: QuoteStatus;

  // Dates
  @Column({ name: 'valid_until', type: 'date' })
  validUntil: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ name: 'viewed_at', type: 'timestamp', nullable: true })
  viewedAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt: Date;

  // Information client (snapshot)
  @Column({ name: 'client_name', length: 255 })
  clientName: string;

  @Column({ name: 'client_company', length: 255 })
  clientCompany: string;

  @Column({ name: 'client_email', length: 255 })
  clientEmail: string;

  @Column({ name: 'client_phone', length: 20, nullable: true })
  clientPhone: string;

  @Column({ name: 'client_address', type: 'text', nullable: true })
  clientAddress: string;

  // Champs spécifiques transport (depuis l'image)
  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ length: 100, nullable: true })
  tiers: string; // Tiers

  @Column({ name: 'attention_to', length: 200, nullable: true })
  attentionTo: string; // L'Attention De

  @Column({ name: 'pickup_location', type: 'text', nullable: true })
  pickupLocation: string; // Enlèvement/Frs

  @Column({ name: 'delivery_location', type: 'text', nullable: true })
  deliveryLocation: string; // Livraison/Dist

  @Column({ name: 'transit_time', length: 100, nullable: true })
  transitTime: string; // Transit-Time

  @Column({ name: 'departure_frequency', length: 100, nullable: true })
  departureFrequency: string; // Fréquence-Départ

  @Column({ name: 'client_type', length: 50, nullable: true })
  clientType: string; // Client/Prospect/Correspondant

  @Column({ name: 'import_export', length: 50, nullable: true })
  importExport: string; // Imp/Exp

  @Column({ name: 'file_status', length: 50, nullable: true })
  fileStatus: string; // Dossier (COMPLET, etc.)

  @Column({ length: 100, nullable: true })
  terms: string; // Terme

  @Column({ name: 'payment_method', length: 100, nullable: true })
  paymentMethod: string; // Payement

  @Column({ name: 'payment_conditions', type: 'text', nullable: true })
  paymentConditions: string; // Cond.Pay

  @Column({ name: 'requester', length: 200, nullable: true })
  requester: string; // Demandeur

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId: number; // Engin

  @ManyToOne(() => Engin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Engin;

  // Calculs financiers
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 19.0 })
  taxRate: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  // Totaux spécifiques (depuis l'image)
  @Column({ name: 'freight_purchased', type: 'decimal', precision: 12, scale: 2, default: 0 })
  freightPurchased: number; // Fret Acheté

  @Column({ name: 'freight_offered', type: 'decimal', precision: 12, scale: 2, default: 0 })
  freightOffered: number; // Fret Offerte

  @Column({ name: 'freight_margin', type: 'decimal', precision: 12, scale: 2, default: 0 })
  freightMargin: number; // Marge Fret

  @Column({ name: 'additional_costs_purchased', type: 'decimal', precision: 12, scale: 2, default: 0 })
  additionalCostsPurchased: number; // Achats Frais

  @Column({ name: 'additional_costs_offered', type: 'decimal', precision: 12, scale: 2, default: 0 })
  additionalCostsOffered: number; // Frais/Offre

  @Column({ name: 'total_purchases', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPurchases: number; // TOT.Achats

  @Column({ name: 'total_offers', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalOffers: number; // TOT.Offre

  @Column({ name: 'total_margin', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalMargin: number; // TOT.Marge

  // Conditions
  @Column({ name: 'payment_terms', length: 100, nullable: true })
  paymentTerms: string;

  @Column({ name: 'delivery_terms', length: 100, nullable: true })
  deliveryTerms: string;

  @Column({ name: 'terms_conditions', type: 'text', nullable: true })
  termsConditions: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'internal_instructions', type: 'text', nullable: true })
  internalInstructions: string; // Instructions Interne

  @Column({ name: 'customer_request', type: 'text', nullable: true })
  customerRequest: string; // Demande

  @Column({ name: 'exchange_notes', type: 'text', nullable: true })
  exchangeNotes: string; // Échange

  // Raison de rejet
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  // QR Code
  @Column({ name: 'qr_code_data', type: 'text', nullable: true })
  qrCodeData: string;

  // 🆕 Champs pour fiche dossier (transport)
  @Column({ length: 50, nullable: true, default: 'cotation' })
  type: string; // 'cotation' | 'fiche_dossier'

  @Column({ name: 'armateur_id', nullable: true })
  armateurId: number;

  @Column({ name: 'navire_id', nullable: true })
  navireId: number;

  @Column({ name: 'port_enlevement_id', nullable: true })
  portEnlevementId: number;

  @Column({ name: 'port_livraison_id', nullable: true })
  portLivraisonId: number;

  @Column({ name: 'aeroport_enlevement_id', nullable: true })
  aeroportEnlevementId: number;

  @Column({ name: 'aeroport_livraison_id', nullable: true })
  aeroportLivraisonId: number;

  @Column({ length: 100, nullable: true })
  hbl: string;

  @Column({ length: 100, nullable: true })
  mbl: string;

  @Column({ type: 'text', nullable: true })
  condition: string;

  // Gestion commerciale
  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => Personnel, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  creator: Personnel;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number;

  @ManyToOne(() => Personnel, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: Personnel;

  @Column({ name: 'commercial_id', nullable: true })
  commercialId: number;

  @ManyToOne(() => Personnel, { nullable: true })
  @JoinColumn({ name: 'commercial_id' })
  commercial: Personnel;

  // Relations
  @OneToMany(() => QuoteItem, (item) => item.quote, { cascade: true })
  items: QuoteItem[];

  @OneToMany(() => Activity, (activity) => activity.quote)
  activities: Activity[];

  // Audit
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
