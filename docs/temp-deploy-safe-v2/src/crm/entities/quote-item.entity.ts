import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quote } from './quote.entity';

export enum QuoteItemCategory {
  GROUPAGE = 'groupage', // LCL
  COMPLET = 'complet', // FCL
  ROUTIER = 'routier',
  AERIEN_NORMALE = 'aerien_normale',
  AERIEN_EXPRESSE = 'aerien_expresse',
}

export enum VehicleType {
  VAN = 'van',
  TRUCK_3_5T = 'truck_3_5t',
  TRUCK_7_5T = 'truck_7_5t',
  TRUCK_12T = 'truck_12t',
  TRUCK_19T = 'truck_19t',
  TRUCK_26T = 'truck_26t',
  SEMI_TRAILER = 'semi_trailer',
  CONTAINER = 'container',
}

// ServiceType n'est plus un enum mais stocké en VARCHAR
// Valeurs possibles: "avec_livraison" ou "sans_livraison"

@Entity('crm_quote_items')
export class QuoteItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quote_id' })
  quoteId: number;

  @ManyToOne(() => Quote, (quote) => quote.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  // Description du service
  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: QuoteItemCategory,
    nullable: true,
  })
  category: QuoteItemCategory;

  // Champs spécifiques depuis l'image (section Cargo)
  @Column({ name: 'vehicle_description', length: 200, nullable: true })
  vehicleDescription: string; // Engin

  @Column({ name: 'cargo_designation', type: 'text', nullable: true })
  cargoDesignation: string; // DESIGNATION MARCH

  @Column({ name: 'packages_count', type: 'integer', nullable: true })
  packagesCount: number; // COLIS

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  weightKg: number; // POIDS

  // Origine
  @Column({ name: 'origin_street', length: 300, nullable: true })
  originStreet: string;

  @Column({ name: 'origin_city', length: 100, nullable: true })
  originCity: string;

  @Column({ name: 'origin_postal_code', length: 20, nullable: true })
  originPostalCode: string;

  @Column({ name: 'origin_country', length: 3, default: 'TUN', nullable: true })
  originCountry: string;

  // Destination
  @Column({ name: 'destination_street', length: 300, nullable: true })
  destinationStreet: string;

  @Column({ name: 'destination_city', length: 100, nullable: true })
  destinationCity: string;

  @Column({ name: 'destination_postal_code', length: 20, nullable: true })
  destinationPostalCode: string;

  @Column({ name: 'destination_country', length: 3, default: 'TUN', nullable: true })
  destinationCountry: string;

  // Détails transport
  @Column({ name: 'distance_km', type: 'decimal', precision: 8, scale: 2, nullable: true })
  distanceKm: number;

  @Column({ name: 'volume_m3', type: 'decimal', precision: 10, scale: 3, nullable: true })
  volumeM3: number;

  // 🆕 Dimensions pour calcul de volume (aérien/groupage)
  @Column({ name: 'length_cm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  lengthCm: number;

  @Column({ name: 'width_cm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  widthCm: number;

  @Column({ name: 'height_cm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  heightCm: number;

  // 🆕 Poids volumétrique (calculé selon catégorie)
  @Column({ name: 'volumetric_weight', type: 'decimal', precision: 10, scale: 2, nullable: true })
  volumetricWeight: number;

  @Column({
    name: 'vehicle_type',
    type: 'enum',
    enum: VehicleType,
    nullable: true,
  })
  vehicleType: VehicleType;

  // Service type devient VARCHAR pour stocker "avec_livraison" ou "sans_livraison"
  @Column({ name: 'service_type', length: 50, nullable: true })
  serviceType: string;

  // 💱 Devise de la ligne (uniquement pour FRET, les FRAIS ANNEXES sont toujours en TND)
  @Column({ name: 'currency', length: 3, nullable: true })
  currency: string;

  // 📊 Taux de conversion pour transformation en devis (ex: 0.95 = 95%, 5% de remise)
  @Column({ name: 'conversion_rate', type: 'decimal', precision: 10, scale: 4, nullable: true })
  conversionRate: number;

  // 🆕 Unité de mesure (ex: 40HC, TONNE, M3, PIECE, etc.)
  @Column({ name: 'unit', length: 50, nullable: true })
  unit: string;

  // Prix et quantités
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;

  // Prix d'achat et de vente (pour calcul de marge)
  @Column({ name: 'purchase_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  purchasePrice: number; // Prix d'achat

  @Column({ name: 'selling_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellingPrice: number; // Prix de vente

  @Column({ name: 'margin', type: 'decimal', precision: 10, scale: 2, default: 0 })
  margin: number; // Marge

  // Type de ligne (pour différencier Fret et Frais Annexes)
  @Column({ name: 'item_type', length: 50, default: 'freight' })
  itemType: string; // 'freight' ou 'additional_cost'

  // 🆕 TAXATION PAR LIGNE (remplace TVA globale)
  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 19.0 })
  taxRate: number; // Taux TVA spécifique (19%, 7%, 0%)

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number; // Montant TVA calculé pour cette ligne

  @Column({ name: 'is_taxable', type: 'boolean', default: true })
  isTaxable: boolean; // Si cette ligne est soumise à TVA

  // 🆕 COMPTABILITÉ
  @Column({ name: 'taxable_account', length: 200, nullable: true })
  taxableAccount: string; // Compte G.Taxable (ex: "PRESTATIONS DE SERVICE IMPORT")

  @Column({ name: 'non_taxable_account', length: 200, nullable: true })
  nonTaxableAccount: string; // Compte Non Taxable (ex: "PRESTATIONS DE SERVICE EN SUISSE")

  // 🆕 CLASSIFICATION
  @Column({ name: 'is_debours', type: 'boolean', default: false })
  isDebours: boolean; // Indicateur débours (frais avancés sans marge)

  @Column({ name: 'ca_type', length: 50, nullable: true, default: 'Oui' })
  caType: string; // Type CA: "Oui", "Non", "Oui débours"

  // Métadonnées
  @Column({ name: 'line_order', type: 'integer', default: 1 })
  lineOrder: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
